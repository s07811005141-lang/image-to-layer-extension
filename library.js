import { SAMPLES } from './data.js';

const SITE = 'https://image2layers.org';
const UTM = 'utm_source=chrome-extension&utm_medium=referral&utm_campaign=example-library';
const params = new URLSearchParams(location.search);
// ?lang=en|zh overrides the browser language (used for the store screenshots).
const lang = (params.get('lang') || navigator.language || 'en').toLowerCase().startsWith('zh')
  ? 'zh'
  : 'en';

const TEXT = {
  en: {
    tagline: 'Layer split examples',
    expand: 'Open in a tab',
    search: 'Search: poster, logo, product, text…',
    all: 'All',
    count: (n) => `${n} image to layer example${n === 1 ? '' : 's'}`,
    empty: 'No example matches that. Try “poster”, “logo” or “product”.',
    layers: (n) => `${n} layers`,
    back: 'All examples',
    sample: 'Sample',
    showAll: 'Show all',
    hideAll: 'Hide all',
    textLayer: 'Text stays pixels',
    layerOrder: 'Top layer first — tick a layer to show or hide it.',
    note: 'An illustrative sample: every layer is full-canvas and transparent around its content, so the stack rebuilds the picture — and saves as a layered PSD.',
    splitOwn: 'Split your own image',
    guide: (label) => `${label} guide`,
    footCta: 'Turn any image into layers at image2layers.org',
    guides: 'Guides',
    howTo: 'How to separate an image into layers',
  },
  zh: {
    tagline: '拆层示例库',
    expand: '在新标签页打开',
    search: '搜索：海报、Logo、商品、文字…',
    all: '全部',
    count: (n) => `${n} 个图片转图层示例`,
    empty: '没有匹配的示例，试试“海报”“Logo”“商品”。',
    layers: (n) => `${n} 层`,
    back: '全部示例',
    sample: '示例',
    showAll: '全部显示',
    hideAll: '全部隐藏',
    textLayer: '文字为图片图层',
    layerOrder: '最上层排在最前——勾选即可显示或隐藏这一层。',
    note: '这是示意用的示例：每一层都是整张画布大小、内容以外透明，叠回去就是原图——也能存成分层 PSD。',
    splitOwn: '拆我自己的图',
    guide: (label) => `${label} 教程`,
    footCta: '去 image2layers.org 把任意图片转成图层',
    guides: '教程',
    howTo: 'How to separate an image into layers',
  },
}[lang];

const CATEGORIES = {
  poster: { en: 'Posters & designs', zh: '海报与设计' },
  product: { en: 'Product photos', zh: '商品图' },
  portrait: { en: 'Portraits', zh: '人像' },
  character: { en: 'Characters', zh: '角色' },
  illustration: { en: 'Illustrations', zh: '插画' },
  scene: { en: 'Screens & scenes', zh: '截图与场景' },
};

const siteUrl = (path, localized = true) =>
  `${SITE}${localized && lang === 'zh' ? (path === '/' ? '/zh' : `/zh${path}`) : path}?${UTM}`;

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of children) if (child != null) node.append(child);
  return node;
};

/** Everything a sample can be found by, in both languages. */
const haystack = new Map(
  SAMPLES.map((s) => [
    s.id,
    [
      s.label.en,
      s.label.zh,
      CATEGORIES[s.category].en,
      CATEGORIES[s.category].zh,
      s.guide?.label,
      ...s.layers.flatMap((l) => [l.name.en, l.name.zh, l.desc.en, l.desc.zh]),
      s.layers.some((l) => l.text) ? 'text 文字' : '',
    ]
      .join(' ')
      .toLowerCase(),
  ])
);

const state = {
  query: params.get('q') || '',
  category: 'all',
};

// ------------------------------------------------------------------ browse

function matches(sample) {
  if (state.category !== 'all' && sample.category !== state.category) return false;
  const hay = haystack.get(sample.id);
  return state.query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token));
}

function renderChips() {
  const chips = document.getElementById('chips');
  chips.replaceChildren();
  const used = new Set(SAMPLES.map((s) => s.category));
  const entries = [['all', TEXT.all], ...Object.entries(CATEGORIES).filter(([k]) => used.has(k)).map(([k, v]) => [k, v[lang]])];
  for (const [key, label] of entries) {
    const chip = el('button', { type: 'button', className: 'chip', textContent: label });
    chip.setAttribute('role', 'tab');
    chip.setAttribute('aria-selected', String(state.category === key));
    chip.addEventListener('click', () => {
      state.category = key;
      renderChips();
      renderGrid();
    });
    chips.append(chip);
  }
}

function renderGrid() {
  const list = SAMPLES.filter(matches);
  const grid = document.getElementById('grid');
  grid.replaceChildren(
    ...list.map((s) => {
      const card = el(
        'button',
        { type: 'button', className: 'card' },
        el('img', { src: s.thumb, alt: '', loading: 'lazy', width: 168, height: 224 }),
        el('span', { className: 'card-title', textContent: s.label[lang] }),
        el('span', { className: 'card-meta', textContent: TEXT.layers(s.layers.length) })
      );
      card.addEventListener('click', () => openDetail(s));
      return el('li', {}, card);
    })
  );
  document.getElementById('count').textContent = TEXT.count(list.length);
  const empty = document.getElementById('empty');
  empty.hidden = list.length > 0;
  empty.textContent = TEXT.empty;
}

// ------------------------------------------------------------------ detail

function openDetail(sample) {
  const browse = document.getElementById('browse');
  const detail = document.getElementById('detail');
  browse.hidden = true;
  detail.hidden = false;
  detail.replaceChildren();

  const back = el('button', { type: 'button', className: 'back', textContent: `← ${TEXT.back}` });
  back.addEventListener('click', () => {
    detail.hidden = true;
    browse.hidden = false;
  });

  const stage = el('div', { className: 'stage' });
  stage.style.aspectRatio = `${sample.width} / ${sample.height}`;
  const images = sample.layers.map((l) =>
    el('img', { src: l.src, alt: l.name[lang], className: 'stage-layer', decoding: 'async' })
  );
  stage.append(...images);

  const rows = sample.layers
    .map((layer, i) => {
      const box = el('input', { type: 'checkbox', checked: true });
      box.addEventListener('change', () => images[i].classList.toggle('off', !box.checked));
      const desc = layer.desc[lang];
      const row = el(
        'li',
        { className: 'layer-row' },
        el(
          'label',
          {},
          box,
          el('img', { src: layer.src, alt: '', className: 'mini' }),
          el(
            'span',
            { className: 'layer-text' },
            el('span', { className: 'layer-name', textContent: layer.name[lang] }),
            layer.text ? el('span', { className: 'tag', textContent: TEXT.textLayer }) : null,
            desc ? el('span', { className: 'layer-desc', textContent: desc }) : null
          )
        )
      );
      // Hovering a row isolates its layer on the stage.
      row.addEventListener('mouseenter', () => {
        stage.classList.add('focus');
        images[i].classList.add('hot');
      });
      row.addEventListener('mouseleave', () => {
        stage.classList.remove('focus');
        images[i].classList.remove('hot');
      });
      return row;
    })
    .reverse(); // top layer first, as in Photoshop's Layers panel

  const setAll = (on) => () => {
    for (const row of rows) row.querySelector('input').checked = on;
    for (const img of images) img.classList.toggle('off', !on);
  };
  const showAll = el('button', { type: 'button', className: 'ghost', textContent: TEXT.showAll });
  const hideAll = el('button', { type: 'button', className: 'ghost', textContent: TEXT.hideAll });
  showAll.addEventListener('click', setAll(true));
  hideAll.addEventListener('click', setAll(false));

  const actions = el(
    'div',
    { className: 'actions' },
    el('a', { className: 'primary', href: siteUrl('/app'), target: '_blank', rel: 'noopener', textContent: TEXT.splitOwn })
  );
  if (sample.guide) {
    actions.append(
      el('a', {
        className: 'secondary',
        href: siteUrl(sample.guide.path, false),
        target: '_blank',
        rel: 'noopener',
        textContent: TEXT.guide(sample.guide.label),
      })
    );
  }

  detail.append(
    back,
    el(
      'div',
      { className: 'detail-body' },
      el('div', { className: 'stage-wrap' }, stage),
      el(
        'div',
        { className: 'panel' },
        el(
          'h1',
          { className: 'detail-title' },
          sample.label[lang],
          el('span', { className: 'badge', textContent: TEXT.sample })
        ),
        el('p', { className: 'hint', textContent: `${TEXT.layers(sample.layers.length)} · ${TEXT.layerOrder}` }),
        el('div', { className: 'toolbar' }, showAll, hideAll),
        el('ol', { className: 'layers' }, ...rows),
        el('p', { className: 'note', textContent: TEXT.note }),
        actions
      )
    )
  );
  document.getElementById('main').scrollTop = 0;
  window.scrollTo(0, 0);
}

// -------------------------------------------------------------------- init

function init() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  const inTab = params.has('tab') || params.has('q');
  document.documentElement.classList.toggle('tab', inTab);

  document.getElementById('brand').href = siteUrl('/');
  document.getElementById('tagline').textContent = TEXT.tagline;

  const expand = document.getElementById('expand');
  expand.hidden = inTab;
  expand.href = 'library.html?tab=1';
  expand.title = TEXT.expand;
  expand.setAttribute('aria-label', TEXT.expand);

  const q = document.getElementById('q');
  q.placeholder = TEXT.search;
  q.setAttribute('aria-label', TEXT.search);
  q.value = state.query;
  q.addEventListener('input', () => {
    state.query = q.value;
    renderGrid();
  });

  const footCta = document.getElementById('footCta');
  footCta.href = siteUrl('/');
  footCta.textContent = `${TEXT.footCta} →`;

  const guides = document.getElementById('guides');
  guides.append(
    el('span', { textContent: `${TEXT.guides}:` }),
    ...[
      ['/png-to-psd', 'PNG to PSD'],
      ['/jpg-to-psd', 'JPG to PSD'],
      ['/guides/how-to-separate-an-image-into-layers', TEXT.howTo],
    ].map(([path, label]) =>
      el('a', { href: siteUrl(path, false), target: '_blank', rel: 'noopener', textContent: label })
    )
  );

  renderChips();
  renderGrid();
  if (!inTab) q.focus();
}

init();
