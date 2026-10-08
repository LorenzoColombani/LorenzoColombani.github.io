import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const packager=fileURLToPath(new URL('./package-preview.py',import.meta.url));
function python(body){
 const loader=`import importlib.util, json, tempfile\nfrom pathlib import Path\nspec=importlib.util.spec_from_file_location('preview', ${JSON.stringify(packager)})\np=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(p)\n`;
 const result=spawnSync('python3',['-B','-c',loader+body],{encoding:'utf8',maxBuffer:2*1024*1024});
 assert.equal(result.status,0,result.stderr||result.stdout||String(result.error));
 return result.stdout;
}

test('website allowlist includes runtime routes and licenses while excluding private and source files',()=>{
 python(String.raw`
assert len(p.WEBSITES)==10
for slug in p.WEBSITES:
    base=p.WEBSITE_PREFIX+slug+'/'
    for name in ['index.html','LICENSE','LICENSE.md','NOTICE.txt']:
        assert p.allowed(base+name), base+name
    for name in ['SOURCE.json','source.json','.env','.git/config','.netlify/state.json','README.md','docs/index.html','src/index.js','package.json','netlify.toml','assets/source.js.map','../../index.html']:
        assert not p.allowed(base+name), base+name
assert not p.allowed(p.WEBSITE_PREFIX+'unknown/index.html')
assert p.allowed(p.WEBSITE_PREFIX+'ai-applied/use-cases/example/index.html')
assert p.allowed(p.WEBSITE_PREFIX+'ai-applied/contributors/example/index.html')
assert p.allowed(p.WEBSITE_PREFIX+'data-vault-foundations/assets/sounds/quest-complete.mp3')
assert not p.allowed(p.WEBSITE_PREFIX+'ai-applied/_astro/private.json')
`);
});

test('imported navigation, Astro islands and encoded assets resolve to their app while escape paths fail',()=>{
 python(String.raw`
base=p.WEBSITE_PREFIX+'ai-applied/'
href='/'+base
html='<a href="'+href+'use-cases/example?q=one#details">Case</a><a href="'+href+'#card-grid">Back</a><a href="https://example.org/">Source</a>'
html+='<astro-island component-url="'+href+'_astro/grid.js" renderer-url="'+href+'_astro/client.js" props="{&quot;attachment&quot;:[0,&quot;'+href+'attachments/wealthy-commitments-report.pdf&quot;]}"></astro-island>'
assert p.dependencies(base+'index.html',html)=={
    base+'use-cases/example/index.html',base+'index.html',base+'_astro/grid.js',
    base+'_astro/client.js',base+'attachments/wealthy-commitments-report.pdf'}
assert p.local_path('/'+base+'contributors','')==base+'contributors/index.html'
assert p.local_path('/'+base+'contributors/person/?q=one#bio','')==base+'contributors/person/index.html'
for href in ['/workshop/index.html','../exam-pacer/index.html','../../../../index.html']:
    try: p.dependencies(base+'index.html','<a href="'+href+'">Escape</a>')
    except RuntimeError: pass
    else: raise AssertionError('Accepted cross-app navigation '+href)
try: p.local_path('../../outside','')
except RuntimeError: pass
else: raise AssertionError('Accepted traversal outside the site')
`);
});

test('preview transformations preserve imported content and attribution while adding one noindex tag',()=>{
 python(String.raw`
source='<html><head><meta name="robots" content="index,follow"></head><body><a href="../work/owned">Internal</a><a href="https://example.org/credit">Credit</a></body></html>'
imported=p.transform(p.WEBSITE_PREFIX+'exam-pacer/index.html',source)
assert imported.count(p.ROBOTS_META)==1
assert 'href="../work/owned"' in imported
assert 'href="https://example.org/credit"' in imported
assert 'content="index,follow"' not in imported
assert p.CANONICAL+'work/owned' in p.transform('workshop/index.html',source)
script='const example="../work/owned";'
assert p.transform(p.WEBSITE_PREFIX+'ai-applied/_astro/grid.js',script)==script
`);
});

test('real package contains all imported runtime routes and licenses with complete closure and no provenance',()=>{
 python(String.raw`
files,sources,edges=p.build()
imported={name for name in files if name.startswith(p.WEBSITE_PREFIX)}
assert len(imported)>150 and edges>2500
for slug in p.WEBSITES:
    app=p.ROOT/p.WEBSITE_PREFIX/slug
    assert p.WEBSITE_PREFIX+slug+'/index.html' in files
    for source in app.rglob('*'):
        if source.is_file():
            relative=source.relative_to(p.ROOT).as_posix()
            assert (relative in files)==p.allowed(relative),relative
            if source.name.startswith(('LICENSE','NOTICE','COPYING')):
                assert files[relative]==source.read_bytes()
assert sum('/ai-applied/use-cases/' in path and path.endswith('/index.html') for path in files)==87
assert sum('/ai-applied/contributors/' in path and path.endswith('/index.html') for path in files)==16
assert sum(path.startswith(p.WEBSITE_PREFIX+'data-vault-foundations/chapters/') for path in files)==14
assert sum('/data-vault-foundations/assets/sounds/' in path for path in files)==8
assert not any(Path(name).name=='SOURCE.json' for name in files)
assert not any(path.startswith('workshop/native-project') for path in files)
for name in ['native-project-host.js','native-project-registry.js','native-project-stage.js','native-project-theme.css','native-projects/ai-applied/index.js']:
    assert not p.allowed('workshop/'+name),name
for name in imported:
    if name.endswith(('.html','.js','.css')):
        assert not p.dependencies(name,files[name].decode())-files.keys(),name
    if name.endswith('.html'):
        assert files[name].decode().count(p.ROBOTS_META)==1,name
try: p.verify({**files,p.WEBSITE_PREFIX+'ai-applied/SOURCE.json':b'private'})
except RuntimeError as error: assert 'Uncurated imported website files' in str(error)
else: raise AssertionError('Private provenance passed final verification')
incomplete=files.copy();del incomplete[p.WEBSITE_PREFIX+'exam-pacer/index.html']
try: p.verify(incomplete)
except RuntimeError as error: assert 'Required assets missing' in str(error)
else: raise AssertionError('Missing website entry passed final verification')
`);
});

test('output replacement still requires matching ownership, hashes and absence of symlinks',()=>{
 python(String.raw`
with tempfile.TemporaryDirectory() as directory:
    root=Path(directory);p.OUTPUT=root/'output';p.MANIFEST=root/'manifest.json'
    p.OUTPUT.mkdir();asset=p.OUTPUT/'index.html';asset.write_bytes(b'owned')
    def refused():
        try:p.owned_output()
        except RuntimeError:return
        raise AssertionError('Unsafe staging was accepted')
    refused()
    p.MANIFEST.write_text(json.dumps({'output':str(p.OUTPUT),'source_root':str(p.ROOT),'files':[{'path':'index.html','sha256':p.digest(b'owned')}]}))
    assert p.owned_output()=={'index.html'}
    asset.write_bytes(b'changed');refused();asset.write_bytes(b'owned')
    extra=p.OUTPUT/'unowned';extra.write_bytes(b'private');refused();extra.unlink()
    link=p.OUTPUT/'link';link.symlink_to(asset);refused();link.unlink()
    assert p.owned_output()=={'index.html'}
`);
});
