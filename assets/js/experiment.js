/* All content ships in HTML; JavaScript adds project selection and search. */
const tabs = [...document.querySelectorAll('.project-tab')];
const panels = [...document.querySelectorAll('.project-panel')];
const selector = document.querySelector('.project-selector');
if (selector && tabs.length === panels.length && tabs.length) {
  selector.setAttribute('role', 'tablist');
  selector.setAttribute('aria-orientation', matchMedia('(max-width: 720px)').matches ? 'horizontal' : 'vertical');
  const orientation = matchMedia('(max-width: 720px)');
  orientation.addEventListener('change', e => selector.setAttribute('aria-orientation', e.matches ? 'horizontal' : 'vertical'));
  const select = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus({ preventScroll: true });
  };
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      let next;
      const forward = orientation.matches ? 'ArrowRight' : 'ArrowDown';
      const backward = orientation.matches ? 'ArrowLeft' : 'ArrowUp';
      if (event.key === forward) next = (index + 1) % tabs.length;
      if (event.key === backward) next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(next, true); }
    });
  });
  select(0);
  document.querySelector('.exhibition').classList.add('projects-ready');
}
const menu = document.querySelector('.menu-toggle');
const links = document.querySelector('.site-links');
const closeMenu = (restoreFocus = false) => {
  if (!menu || !links || menu.getAttribute('aria-expanded') !== 'true') return;
  menu.setAttribute('aria-expanded', 'false');
  links.classList.remove('is-open');
  if (restoreFocus) menu.focus();
};
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  links.classList.toggle('is-open', open);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-nav')) closeMenu();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(true); });
matchMedia('(max-width: 520px)').addEventListener('change', () => closeMenu());
links?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
  const target = document.getElementById(link.hash.slice(1));
  if (target) {
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}));
const search = document.querySelector('#archive-search');
const chips = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.archive-grid .card')];
let category = 'all';
const filter = () => {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  cards.forEach(card => {
    const matchesCategory = category === 'all' || card.dataset.category.split(' ').includes(category);
    const matchesSearch = card.textContent.toLocaleLowerCase().includes(query);
    card.hidden = !(matchesCategory && matchesSearch);
    if (!card.hidden) count++;
  });
  document.querySelector('.archive-count').textContent = `${count} ${count === 1 ? 'project' : 'projects'}`;
  document.querySelector('.archive-empty').hidden = count !== 0;
};
chips.forEach(chip => chip.addEventListener('click', () => {
  category = chip.dataset.filter;
  chips.forEach(other => other.setAttribute('aria-pressed', String(chip === other)));
  filter();
}));
search?.addEventListener('input', filter);
const dialog = document.querySelector('.image-dialog');
let imageTrigger;
document.querySelectorAll('.image-enlarge').forEach(button => button.addEventListener('click', () => {
  const image = button.querySelector('img');
  dialog.querySelector('img').src = image.src;
  dialog.querySelector('img').alt = image.alt;
  document.querySelector('#image-dialog-title').textContent = button.closest('.project-panel').querySelector('h3').textContent;
  imageTrigger = button;
  dialog.showModal();
  document.documentElement.classList.add('dialog-open');
}));
dialog?.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog?.addEventListener('close', () => {
  document.documentElement.classList.remove('dialog-open');
  imageTrigger?.focus({ preventScroll: true });
});
