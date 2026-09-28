// Two context-menu entries. Nothing is read from the page: the selected text
// only goes into the library's own URL, and the image entry opens the site.
const SITE = 'https://image2layers.org';
const UTM = 'utm_source=chrome-extension&utm_medium=referral&utm_campaign=example-library';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'search-examples',
    title: chrome.i18n.getMessage('menuSearch'),
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'split-image',
    title: chrome.i18n.getMessage('menuSplit'),
    contexts: ['image'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'search-examples') {
    const q = (info.selectionText || '').trim().slice(0, 80);
    chrome.tabs.create({
      url: chrome.runtime.getURL(`library.html?q=${encodeURIComponent(q)}`),
    });
  } else if (info.menuItemId === 'split-image') {
    const zh = chrome.i18n.getUILanguage().toLowerCase().startsWith('zh');
    chrome.tabs.create({ url: `${SITE}${zh ? '/zh' : ''}/app?${UTM}` });
  }
});
