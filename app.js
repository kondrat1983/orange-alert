/* Orange Alert PWA (MVP). Built from mockup/app.js.
 *
 * Reads ./data/statements.json, ./data/status.json and ./data/globe.json written by the
 * pipeline (see pipeline/run.py and app/README.md). pending.json is never shown.
 * There are NO quotes in this file: real quotes come only from the data files.
 * Demo mode (?demo=1) uses built-in placeholder data, never quotes.
 * Joke texts are the approved texts from docs/TEXTS.md; nothing else here is a joke.
 */
(function () {
  'use strict';

  const DATA_BASE = './data/';
  const REFRESH_MS = 5 * 60e3;
  const MUTE_MS = 24 * 3600e3;
  const EMAIL = 'kondrat1983@gmail.com'; // error-report contact (DECISIONS.md 2026-10-17)
  const REPO_URL = 'https://github.com/kondrat1983/orange-alert';
  const DEMO = new URLSearchParams(location.search).get('demo') === '1';

  // ---------- storage (per-viewer convenience only) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('oa.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('oa.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  const NOTIFY_DEFAULTS = { on: true, digest: true, perOrange: false, tUkraine: true, tRussia: true, qFrom: '22:00', qTo: '10:00' };
  const state = {
    lang: store.get('lang', 'uk') === 'en' ? 'en' : 'uk',
    theme: store.get('theme', null),
    feed: { region: 'all', topic: 'all', q: '' },
    notify: Object.assign({}, NOTIFY_DEFAULTS, store.get('notify', {})),
    muteUntil: +store.get('muteUntil', 0) || 0,
    demoLevel: 'orange',
    data: null,       // { statements: [], status, globe, updatedAt, failed }
    loaded: false
  };

  // ---------- texts (approved texts: docs/TEXTS.md) ----------
  const T = {
    uk: {
      appName: 'Помаранчева тривога',
      demoBanner: 'Демо-режим: дані — заглушки, цитат немає.',
      demoLevel: 'Демо: перемкніть рівень',
      tabHome: 'Головна', tabFeed: 'Стрічка', tabNotify: 'Сповіщення', tabAbout: 'Про проєкт',
      lvl_green: 'Тиша.', tag_green: 'Трамп про Україну мовчить. Користуйтеся моментом.',
      lvl_yellow: 'Увага!', tag_yellow: 'У Вашингтоні прокинувся Дональд Трамп. Тримайтеся подалі від стрічки новин.',
      lvl_orange: 'Помаранчева тривога!', tag_orange: 'Трамп говорить про Україну. Масова евакуація з інтернету! Пройдіть до найближчого офлайну.',
      lvl_white: 'Відбій.', tag_white: 'Можна повертатися в інтернет. Можливі повторні заяви.',
      lvl_neutral: 'Нова заява про Україну.',
      basedOn: 'Підстава: {x}.',
      untilOrange: 'Рівень триває до {time} (Київ), 6 год після останньої заяви.',
      untilWhite: '⚪ показується до {time} (Київ), потім 🟢. На ⚪ сповіщень немає.',
      safeTpl: 'Ми в безпеці: сьогодні дісталося {region}. Видихаємо 😮‍💨',
      day_asleep: 'Трамп спить. Інтернет у безпеці.',
      day_awake: 'У Вашингтоні прокинувся Трамп. Чекаємо.',
      day_at_mic: 'Трамп біля мікрофона. Відійдіть від екранів.',
      day_night_posting: 'Нічний постинг. Truth Social під загрозою.',
      day_busy_elsewhere: 'Ми в безпеці: сьогодні дісталося {region}. Видихаємо 😮‍💨',
      delay: 'Дані надходять із затримкою 10–60 хв.',
      washington: 'Вашингтон', kyiv: 'Київ', gap: 'різниця {n} год',
      globeTitle: 'Куди дивиться Трамп · 24 год',
      globeHint: 'Тягніть, щоб обертати. Торкніться підсвіченого регіону.',
      globeFail: 'Глобус не завантажився. Потрібен інтернет.',
      lgUkraine: 'Україна', lgOther: 'інші регіони', lgQuiet: 'тихо',
      inWindow: 'За 24 год: {n}',
      noStatements: 'За 24 год заяв немає.',
      latest: 'Остання заява',
      openFeed: 'Відкрити в стрічці', close: 'Закрити', open: 'Відкрити',
      c1: 'днів від останньої заяви про Україну',
      c2: 'заяв про Україну за 7 днів',
      c3: '24 години тривають уже {N} днів', c3base: 'база: 05.11.2024',
      grass: 'Торкнутися трави',
      grassSub: 'вийти з інтернету на 24 години',
      grassOn: 'Ви на траві до {time}. Тут тихо.',
      grassCancel: 'Торкніться, щоб скасувати',
      feedTitle: 'Стрічка заяв',
      searchPh: 'Пошук: цитата, регіон, тема, джерело…',
      allRegions: 'Усі регіони', allTopics: 'Усі теми',
      emptyTitle: 'Заяв немає. Підозріло.',
      emptySub: 'Нічого не знайдено. Змініть фільтр.',
      loadFail: 'Не вдалося завантажити дані. Спробуйте пізніше.',
      updated: 'Дані оновлено: {time} (Київ)',
      paraphrase: 'Переказ',
      paraphraseNote: 'Прямої цитати немає, лише переказ із джерела. Переказ не вмикає 🟠.',
      retracted: 'Відкликано: {reason}',
      victimsNote: 'Тема: жертви. Жартівливе оформлення (рівні, бейджі) для цього запису вимкнено.',
      back: '← Назад',
      fDate: 'Дата і час (Київ)', fPlatform: 'Платформа', fRegion: 'Регіон', fTopics: 'Теми', fSources: 'Джерела',
      primary: 'першоджерело',
      mt: 'машинний переклад',
      original: 'Оригінал (EN)', translation: 'Переклад (UA)', paraphraseSrc: 'Переказ із джерела (EN)',
      noTranslation: 'Перекладу ще немає. Показуємо оригінал англійською.',
      report: 'Повідомити про помилку', share: 'Поділитися',
      reportText: 'Напишіть на {email}: посилання на заяву і що саме не так. Ми перевіримо й виправимо або позначимо запис «Відкликано».',
      copied: 'Посилання скопійовано',
      notFound: 'Заяву не знайдено.',
      nTitle: 'Сповіщення',
      nMaster: 'Сповіщення', nMasterD: 'Загальний вимикач.',
      nDigest: 'Щоденний дайджест', nDigestD: 'Раз на день, увечері за Києвом (час уточнюється). Увімкнено за замовчуванням.',
      nOrange: 'Пуш на кожну 🟠', nOrangeD: 'Вимкнено за замовчуванням. Увімкніть, якщо хочете знати одразу.',
      nTopics: 'Теми, що вмикають 🟠 і пуші',
      nTopicUA: 'Україна, Зеленський, війна', nTopicUAD: 'Перемовини, допомога, зброя, території.',
      nTopicRU: 'Путін і Росія', nTopicRUD: 'Будь-які заяви про Путіна чи Росію.',
      nOther: 'Інші регіони видно на глобусі й у стрічці, але пушів вони не надсилають.',
      nQuiet: 'Тихі години (Київ)', nQuietD: 'За замовчуванням 22:00–10:00. У цей час пушів немає.',
      nFrom: 'з', nTo: 'до',
      nCap: 'Не більше 3 сповіщень на день, разом із дайджестом. На ⚪ сповіщень немає.',
      nIos: 'iPhone: сповіщення працюватимуть лише після «Поділитися» → «На початковий екран». Потім відкрийте застосунок з іконки.',
      nPreview: 'Так виглядатиме сповіщення',
      pushTitle: '🟠 Помаранчева тривога',
      pushBody: 'Трамп знову говорить про Україну', digestTitle: '🟠 Помаранчева тривога: підсумок дня.', digestBody: 'Україна {N}, {top_region} {M}', pushLangNote: '',
      nNotYet: 'Пуші ще не працюють: вони з’являться в наступній версії. Налаштування поки зберігаються лише в цьому браузері.',
      aTitle: 'Про проєкт',
      disclaimer: 'Сатиричний проєкт. Цитати справжні, коментарі наші.',
      aHow: 'Як це працює',
      aHow1: 'Кожні 30 хв скрипт перевіряє новини й стенограми. Без ШІ.',
      aHow2: 'Публікуємо лише дослівні цитати, знайдені у двох незалежних джерелах або в першоджерелі.',
      aHow3: 'Переказ позначаємо «Переказ», і він не вмикає 🟠.',
      aHow4: 'Переклад машинний (Argos Translate); оригінал англійською завжди поруч.',
      aHow5: 'Хибні записи не зникають тихо, а позначаються «Відкликано: причина».',
      aSources: 'Джерела',
      aSourcesT: 'BBC, NPR, Al Jazeera, Politico, Kyiv Independent, Українська правда, Укрінформ, whitehouse.gov (першоджерело). Reuters, AP і CNN — лише як посилання.',
      aSourcesLink: 'Повний список джерел',
      aReport: 'Повідомити про помилку',
      aReportT: 'Пишіть на {email}: посилання на заяву і що не так.',
      aSafety: 'Це не повітряна тривога: без сирен і без червоного. Справжні тривоги — лише в офіційних застосунках.',
      aAff: 'Проєкт не пов’язаний з жодною державою, партією, медіа чи політиком.',
      aCode: 'Код відкритий, ліцензія MIT.',
      themeLight: 'Світла тема', themeDark: 'Темна тема'
    },
    en: {
      appName: 'Orange Alert',
      demoBanner: 'Demo mode: placeholder data, no quotes.',
      demoLevel: 'Demo: switch level',
      tabHome: 'Home', tabFeed: 'Feed', tabNotify: 'Alerts', tabAbout: 'About',
      lvl_green: 'All quiet.', tag_green: 'Trump is silent on Ukraine. Enjoy it while it lasts.',
      lvl_yellow: 'Attention!', tag_yellow: 'Donald Trump has woken up in Washington. Stay away from your news feed.',
      lvl_orange: 'Orange alert!', tag_orange: 'Trump is talking about Ukraine. Mass evacuation from the internet! Proceed to the nearest offline.',
      lvl_white: 'All clear.', tag_white: 'You may return to the internet. Repeat statements possible.',
      lvl_neutral: 'New statement about Ukraine.',
      basedOn: 'Based on: {x}.',
      untilOrange: 'The level lasts until {time} (Kyiv), 6 h after the latest statement.',
      untilWhite: '⚪ shows until {time} (Kyiv), then 🟢. No notifications on ⚪.',
      safeTpl: 'We\'re safe: today {region} got it. Exhale 😮‍💨',
      day_asleep: 'Trump is asleep. The internet is safe.',
      day_awake: 'Trump is awake in Washington. We wait.',
      day_at_mic: 'Trump is at the microphone. Step away from your screens.',
      day_night_posting: 'Night posting. Truth Social under threat.',
      day_busy_elsewhere: 'We\'re safe: today {region} got it. Exhale 😮‍💨',
      delay: 'Data arrive with a 10–60 min delay.',
      washington: 'Washington', kyiv: 'Kyiv', gap: '{n} h apart',
      globeTitle: 'Where Trump is looking · 24 h',
      globeHint: 'Drag to rotate. Tap a lit region.',
      globeFail: 'The globe did not load. Internet connection needed.',
      lgUkraine: 'Ukraine', lgOther: 'other regions', lgQuiet: 'quiet',
      inWindow: 'In 24 h: {n}',
      noStatements: 'No statements in 24 h.',
      latest: 'Latest statement',
      openFeed: 'Open in feed', close: 'Close', open: 'Open',
      c1: 'days since the latest statement about Ukraine',
      c2: 'statements about Ukraine in 7 days',
      c3: 'The 24 hours have lasted {N} days', c3base: 'baseline: 5 Nov 2024',
      grass: 'Touch grass',
      grassSub: 'leave the internet for 24 hours',
      grassOn: 'You\'re on the grass until {time}. It\'s quiet here.',
      grassCancel: 'Tap to cancel',
      feedTitle: 'Statements feed',
      searchPh: 'Search: quote, region, topic, source…',
      allRegions: 'All regions', allTopics: 'All topics',
      emptyTitle: 'No statements. Suspicious.',
      emptySub: 'Nothing found. Change the filter.',
      loadFail: 'Could not load the data. Try again later.',
      updated: 'Data updated: {time} (Kyiv)',
      paraphrase: 'Paraphrase',
      paraphraseNote: 'No direct quote, only a paraphrase from the source. Paraphrases never trigger 🟠.',
      retracted: 'Retracted: {reason}',
      victimsNote: 'Topic: victims. Joke framing (levels, badges) is turned off for this entry.',
      back: '← Back',
      fDate: 'Date and time (Kyiv)', fPlatform: 'Platform', fRegion: 'Region', fTopics: 'Topics', fSources: 'Sources',
      primary: 'primary source',
      mt: 'machine translation',
      original: 'Original (EN)', translation: 'Translation (UA)', paraphraseSrc: 'Paraphrase from the source (EN)',
      noTranslation: 'No translation yet. Showing the English original.',
      report: 'Report an error', share: 'Share',
      reportText: 'Email {email}: the link to the statement and what is wrong. We will check and fix it or mark the entry "Retracted".',
      copied: 'Link copied',
      notFound: 'Statement not found.',
      nTitle: 'Notifications',
      nMaster: 'Notifications', nMasterD: 'Main switch.',
      nDigest: 'Daily digest', nDigestD: 'Once a day, Kyiv evening (time to be set). On by default.',
      nOrange: 'Push on every 🟠', nOrangeD: 'Off by default. Turn on if you want to know right away.',
      nTopics: 'Topics that trigger 🟠 and push',
      nTopicUA: 'Ukraine, Zelensky, the war', nTopicUAD: 'Peace talks, aid, weapons, territory.',
      nTopicRU: 'Putin and Russia', nTopicRUD: 'Any statement about Putin or Russia.',
      nOther: 'Other regions show on the globe and in the feed but never send push.',
      nQuiet: 'Quiet hours (Kyiv)', nQuietD: 'Default 22:00–10:00. No push during these hours.',
      nFrom: 'from', nTo: 'to',
      nCap: 'At most 3 notifications a day, digest included. No notifications on ⚪.',
      nIos: 'iPhone: notifications will work only after Share → "Add to Home Screen". Then open the app from its icon.',
      nPreview: 'This is how a notification will look',
      pushTitle: '🟠 Помаранчева тривога',
      pushBody: 'Трамп знову говорить про Україну', digestTitle: '🟠 Помаранчева тривога: підсумок дня.', digestBody: 'Україна {N}, {top_region} {M}', pushLangNote: 'Push texts are Ukrainian only for now.',
      nNotYet: 'Push does not work yet: it comes in the next version. Settings are saved only in this browser for now.',
      aTitle: 'About',
      disclaimer: 'Satirical project. Quotes are real, comments are ours.',
      aHow: 'How it works',
      aHow1: 'Every 30 min a script checks news and transcripts. No AI.',
      aHow2: 'We publish only verbatim quotes found in two independent outlets or in a primary source.',
      aHow3: 'Paraphrases are marked "Paraphrase" and never trigger 🟠.',
      aHow4: 'Translation is machine-made (Argos Translate); the English original is always shown.',
      aHow5: 'Wrong entries never disappear silently; they are marked "Retracted: reason".',
      aSources: 'Sources',
      aSourcesT: 'BBC, NPR, Al Jazeera, Politico, Kyiv Independent, Ukrainska Pravda, Ukrinform, whitehouse.gov (primary). Reuters, AP and CNN are link-only.',
      aSourcesLink: 'Full list of sources',
      aReport: 'Report an error',
      aReportT: 'Email {email}: the link to the statement and what is wrong.',
      aSafety: 'This is not an air-raid alert: no sirens and no red. Real alerts come only from official apps.',
      aAff: 'Not affiliated with any state, party, media outlet or politician.',
      aCode: 'Open source, MIT licence.',
      themeLight: 'Light theme', themeDark: 'Dark theme'
    }
  };
  function t(key, vars) {
    let s = (T[state.lang] && T[state.lang][key] !== undefined) ? T[state.lang][key] : (T.uk[key] !== undefined ? T.uk[key] : key);
    vars = Object.assign({ email: EMAIL }, vars || {});
    Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '#';
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

  // ---------- reference data (keys as written by pipeline/classify.py) ----------
  // ids: ISO 3166 numeric as used by world-atlas. dat: Ukrainian dative for «дісталося {region}».
  const REGIONS = {
    ukraine:     { ids: ['804'], uk: 'Україна', en: 'Ukraine', dat: 'Україні' },
    russia:      { ids: ['643'], uk: 'Росія', en: 'Russia', dat: 'Росії' },
    greenland:   { ids: ['304', '208'], uk: 'Гренландія / Данія', en: 'Greenland / Denmark', short: { uk: 'Гренландія', en: 'Greenland' }, dat: 'Гренландії' },
    canada:      { ids: ['124'], uk: 'Канада', en: 'Canada', dat: 'Канаді' },
    mexico:      { ids: ['484'], uk: 'Мексика', en: 'Mexico', dat: 'Мексиці' },
    panama:      { ids: ['591'], uk: 'Панама', en: 'Panama', dat: 'Панамі' },
    china:       { ids: ['156'], uk: 'Китай', en: 'China', dat: 'Китаю' },
    venezuela:   { ids: ['862'], uk: 'Венесуела', en: 'Venezuela', dat: 'Венесуелі' },
    middle_east: { ids: ['376', '275', '364'], uk: 'Близький Схід', en: 'Middle East', short: { uk: 'Близький Схід', en: 'the Middle East' }, dat: 'Близькому Сходу' },
    eu_nato:     { ids: ['250', '276', '616', '380', '724', '826', '528', '056', '752', '246', '578', '642', '440', '428', '233', '203', '703', '348', '040', '620', '300', '100', '191', '705', '008', '499', '807'], uk: 'ЄС / НАТО', en: 'EU / NATO', dat: 'ЄС / НАТО' },
    us_domestic: { ids: ['840'], uk: 'США: внутрішні справи', en: 'US: domestic', short: { uk: 'США', en: 'the US' }, dat: 'США' }
  };
  // US states as named by pipeline/classify.py ("Washington State" arrives as "Washington").
  // [uk, uk dative, lon, lat]
  const US_STATES = {
    'Alabama': ['Алабама', 'Алабамі', -86.8, 32.8], 'Alaska': ['Аляска', 'Алясці', -152.3, 64.2],
    'Arizona': ['Аризона', 'Аризоні', -111.7, 34.3], 'Arkansas': ['Арканзас', 'Арканзасу', -92.4, 34.9],
    'California': ['Каліфорнія', 'Каліфорнії', -119.4, 37.2], 'Colorado': ['Колорадо', 'Колорадо', -105.5, 39.0],
    'Connecticut': ['Коннектикут', 'Коннектикуту', -72.7, 41.6], 'Delaware': ['Делавер', 'Делаверу', -75.5, 39.0],
    'Florida': ['Флорида', 'Флориді', -81.7, 28.6], 'Georgia': ['Джорджія', 'Джорджії', -83.4, 32.7],
    'Hawaii': ['Гаваї', 'Гаваям', -155.5, 19.9], 'Idaho': ['Айдахо', 'Айдахо', -114.6, 44.4],
    'Illinois': ['Іллінойс', 'Іллінойсу', -89.2, 40.0], 'Indiana': ['Індіана', 'Індіані', -86.3, 39.9],
    'Iowa': ['Айова', 'Айові', -93.5, 42.1], 'Kansas': ['Канзас', 'Канзасу', -98.4, 38.5],
    'Kentucky': ['Кентуккі', 'Кентуккі', -85.3, 37.5], 'Louisiana': ['Луїзіана', 'Луїзіані', -92.0, 31.1],
    'Maine': ['Мен', 'Мену', -69.2, 45.4], 'Maryland': ['Меріленд', 'Меріленду', -76.8, 39.0],
    'Massachusetts': ['Массачусетс', 'Массачусетсу', -71.8, 42.3], 'Michigan': ['Мічиган', 'Мічигану', -84.7, 44.3],
    'Minnesota': ['Міннесота', 'Міннесоті', -94.3, 46.3], 'Mississippi': ['Міссісіпі', 'Міссісіпі', -89.7, 32.7],
    'Missouri': ['Міссурі', 'Міссурі', -92.5, 38.4], 'Montana': ['Монтана', 'Монтані', -109.6, 47.0],
    'Nebraska': ['Небраска', 'Небрасці', -99.8, 41.5], 'Nevada': ['Невада', 'Неваді', -116.6, 39.3],
    'New Hampshire': ['Нью-Гемпшир', 'Нью-Гемпширу', -71.6, 43.7], 'New Jersey': ['Нью-Джерсі', 'Нью-Джерсі', -74.7, 40.2],
    'New Mexico': ['Нью-Мексико', 'Нью-Мексико', -106.1, 34.4], 'New York': ['Нью-Йорк', 'Нью-Йорку', -75.5, 42.9],
    'North Carolina': ['Північна Кароліна', 'Північній Кароліні', -79.4, 35.6], 'North Dakota': ['Північна Дакота', 'Північній Дакоті', -100.5, 47.5],
    'Ohio': ['Огайо', 'Огайо', -82.8, 40.3], 'Oklahoma': ['Оклахома', 'Оклахомі', -97.5, 35.6],
    'Oregon': ['Орегон', 'Орегону', -120.6, 43.9], 'Pennsylvania': ['Пенсильванія', 'Пенсильванії', -77.6, 40.9],
    'Rhode Island': ['Род-Айленд', 'Род-Айленду', -71.5, 41.7], 'South Carolina': ['Південна Кароліна', 'Південній Кароліні', -80.9, 33.9],
    'South Dakota': ['Південна Дакота', 'Південній Дакоті', -100.2, 44.4], 'Tennessee': ['Теннессі', 'Теннессі', -86.3, 35.9],
    'Texas': ['Техас', 'Техасу', -99.3, 31.5], 'Utah': ['Юта', 'Юті', -111.7, 39.3],
    'Vermont': ['Вермонт', 'Вермонту', -72.7, 44.1], 'Virginia': ['Вірджинія', 'Вірджинії', -78.8, 37.5],
    'Washington': ['штат Вашингтон', 'штату Вашингтон', -120.5, 47.4], 'West Virginia': ['Західна Вірджинія', 'Західній Вірджинії', -80.6, 38.6],
    'Wisconsin': ['Вісконсин', 'Вісконсину', -89.8, 44.6], 'Wyoming': ['Вайомінг', 'Вайомінгу', -107.6, 43.0]
  };
  const stateName = s => (US_STATES[s] && state.lang === 'uk') ? US_STATES[s][0] : s;
  const stateCoord = s => US_STATES[s] ? [US_STATES[s][2], US_STATES[s][3]] : null;
  function regionName(key, usState) {
    if (!REGIONS[key]) return key || '—';
    if (key === 'us_domestic' && usState) return (state.lang === 'uk' ? 'США: ' : 'US: ') + stateName(usState);
    return REGIONS[key][state.lang];
  }
  // Region for «Ми в безпеці: сьогодні дісталося {region}» (Ukrainian dative).
  function regionDat(key, usState) {
    if (key === 'us_domestic' && usState) return state.lang === 'uk' ? (US_STATES[usState] ? US_STATES[usState][1] : usState) : usState;
    const r = REGIONS[key];
    if (!r) return key || '—';
    if (state.lang === 'uk') return r.dat;
    return r.short ? r.short.en : r.en;
  }
  const TOPICS = {
    war: { uk: 'війна', en: 'war' },
    peace_talks: { uk: 'перемовини', en: 'peace talks' },
    aid: { uk: 'допомога', en: 'aid' },
    weapons: { uk: 'зброя', en: 'weapons' },
    sanctions: { uk: 'санкції', en: 'sanctions' },
    territory: { uk: 'території', en: 'territory' },
    tariffs: { uk: 'мита', en: 'tariffs' },
    deadline: { uk: 'дедлайни', en: 'deadlines' }
  };
  const topicName = k => TOPICS[k] ? TOPICS[k][state.lang] : k;
  const PLATFORMS = {
    speech: { uk: 'промова', en: 'speech' },
    truth_social: { uk: 'Truth Social', en: 'Truth Social' },
    x: { uk: 'X', en: 'X' },
    interview: { uk: 'інтерв’ю', en: 'interview' },
    press_conference: { uk: 'пресконференція', en: 'press conference' },
    unknown: { uk: 'платформа не вказана', en: 'platform not stated' }
  };
  const platformName = k => (PLATFORMS[k] || PLATFORMS.unknown)[state.lang];
  const DAY_STATES = ['asleep', 'awake', 'at_mic', 'night_posting', 'busy_elsewhere'];
  const DAY_EMOJI = { asleep: '😴', awake: '☀️', at_mic: '🎤', night_posting: '🌙', busy_elsewhere: '🌍' };
  const LEVEL_EMOJI = { green: '🟢', yellow: '🟡', orange: '🟠', white: '⚪' };

  // ---------- time helpers ----------
  const locale = () => (state.lang === 'uk' ? 'uk-UA' : 'en-GB');
  const KYIV = 'Europe/Kyiv', WASH = 'America/New_York';
  function fmtTime(d, tz) { return new Intl.DateTimeFormat(locale(), { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d); }
  function fmtDateTime(d, tz) { return new Intl.DateTimeFormat(locale(), { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d); }
  function tzOffsetMin(tz, d) {
    try {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(d).find(x => x.type === 'timeZoneName').value;
      const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(p);
      return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
    } catch (e) { return null; }
  }
  // Kyiv calendar day of a moment, as a UTC midnight timestamp.
  function kyivDay(d) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: KYIV, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    const g = k => +p.find(x => x.type === k).value;
    return Date.UTC(g('year'), g('month') - 1, g('day'));
  }
  const parseT = s => { const v = Date.parse(s || ''); return isNaN(v) ? null : v; };
  function daysSinceIso(isoDate) { // 'YYYY-MM-DD' (calendar date) or full timestamp
    if (!isoDate) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const [y, m, d] = isoDate.split('-').map(Number);
      return Math.round((kyivDay(new Date()) - Date.UTC(y, m - 1, d)) / 864e5);
    }
    const v = parseT(isoDate);
    return v === null ? null : Math.round((kyivDay(new Date()) - kyivDay(new Date(v))) / 864e5);
  }

  // ---------- icon (variant 1: alert light) ----------
  const ICON = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#13233f"/>' +
    '<g stroke="#f28c28" stroke-width="3" stroke-linecap="round"><path d="M32 8v6"/><path d="M14 16l4 4"/><path d="M50 16l-4 4"/><path d="M8 32h6"/><path d="M50 32h6"/></g>' +
    '<path d="M18 44a14 14 0 0 1 28 0z" fill="#f28c28"/><path d="M25 38a7 7 0 0 1 7-7" stroke="#fde7cf" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<rect x="14" y="44" width="36" height="6" rx="3" fill="#f28c28"/></svg>';

  // ---------- data ----------
  const EMPTY_STATUS = {
    alert: { level: 'green', emoji: '🟢', since: null, until: null, statement_id: null, jokes_off: false, based_on: null, based_on_uk: null },
    day: { state: null, emoji: null, based_on: null, based_on_uk: null, delay_note: true, region: null, us_state: null },
    counters: { baseline_24h: '2024-11-05' }
  };
  async function getJSON(name) {
    try {
      const r = await fetch(DATA_BASE + name, { cache: 'no-cache' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }
  async function loadData() {
    if (DEMO) { state.data = demoData(state.demoLevel); state.loaded = true; return; }
    const [st, status, globe] = await Promise.all([getJSON('statements.json'), getJSON('status.json'), getJSON('globe.json')]);
    const statements = (st && Array.isArray(st.statements) ? st.statements : [])
      .filter(s => s && (s.status === 'published' || s.status === 'retracted') && typeof s.id === 'string')
      .sort((a, b) => (parseT(b.said_at) || 0) - (parseT(a.said_at) || 0));
    state.data = {
      statements,
      status: normaliseStatus(status),
      globe: globe && globe.regions ? globe : { regions: {}, focus: null, focus_us_state: null },
      updatedAt: (st && st.updated_at) || (status && status.generated_at) || null,
      failed: !st && !status && !globe
    };
    state.loaded = true;
  }
  // Fill gaps and apply the clock: an 🟠 whose `until` has passed becomes ⚪ for 1 h, then 🟢,
  // so a stale status.json (pipeline paused) never shows an old alert as current.
  function normaliseStatus(s) {
    const out = {
      alert: Object.assign({}, EMPTY_STATUS.alert, s && s.alert),
      day: Object.assign({}, EMPTY_STATUS.day, s && s.day),
      counters: Object.assign({}, EMPTY_STATUS.counters, s && s.counters)
    };
    if (!LEVEL_EMOJI[out.alert.level]) out.alert.level = 'green';
    const now = Date.now(), until = parseT(out.alert.until);
    if (until !== null && now >= until) {
      if (out.alert.level === 'orange' && now < until + 3600e3) {
        out.alert = Object.assign({}, out.alert, { level: 'white', since: out.alert.until, until: new Date(until + 3600e3).toISOString() });
      } else if (out.alert.level === 'orange' || out.alert.level === 'white') {
        out.alert = Object.assign({}, out.alert, { level: 'green', since: null, until: null, jokes_off: false });
      }
    }
    out.alert.emoji = LEVEL_EMOJI[out.alert.level];
    return out;
  }
  const byId = id => state.data.statements.find(s => s.id === id);
  const isLive = s => s.status === 'published';
  const outlets = s => Array.from(new Set((s.sources || []).map(x => x.outlet))).join(', ');

  // ---------- demo data (?demo=1): placeholders only, never quotes ----------
  function demoData(level) {
    const now = Date.now(), h = n => new Date(now - n * 3600e3).toISOString().replace(/\.\d+Z$/, 'Z');
    const src = (...names) => names.map(n => ({ outlet: n, url: 'https://example.com/' + n.toLowerCase().replace(/\s+/g, '-'), independence_group: n, primary: false }));
    const QEN = 'Тут буде дослівна цитата англійською / Verbatim English quote goes here';
    const QUK = 'Тут буде український переклад (заглушка)';
    const PARA = 'Тут буде переказ із джерела / Paraphrase from the source goes here';
    const mk = (id, o) => Object.assign({ id: 'demo-' + id, quote_en: QEN, quote_uk: QUK, translation: 'machine', is_paraphrase: false, platform: 'truth_social',
      region: 'ukraine', us_state: null, topics: [], triggers_alert: false, victims_flag: false, sources: src('Example News', 'Example Wire'), status: 'published', retract_reason: null }, o);
    const st = [
      mk(1, { said_at: h(1), topics: ['weapons'], triggers_alert: true }),
      mk(2, { said_at: h(3), quote_en: PARA, quote_uk: null, translation: null, is_paraphrase: true, platform: 'press_conference', topics: ['aid'], triggers_alert: true, sources: src('Example News') }),
      mk(3, { said_at: h(5), region: 'russia', topics: ['sanctions'], triggers_alert: true, platform: 'interview', sources: src('Example Wire', 'Example Times') }),
      mk(4, { said_at: h(8), region: 'greenland', topics: ['territory'], platform: 'x', quote_uk: null, translation: null }),
      mk(5, { said_at: h(11), region: 'us_domestic', us_state: 'California', platform: 'speech' }),
      mk(6, { said_at: h(26), topics: ['war'], triggers_alert: true, victims_flag: true, platform: 'speech', sources: src('Example Times', 'Example Wire') }),
      mk(7, { said_at: h(30), region: 'china', topics: ['tariffs'] }),
      mk(8, { said_at: h(50), topics: ['territory'], triggers_alert: true, status: 'retracted', retract_reason: 'тут буде причина (демо) · reason goes here (demo)', sources: src('Example News') }),
      mk(9, { said_at: h(60), region: 'middle_east', platform: 'press_conference' }),
      mk(10, { said_at: h(80), region: 'canada', topics: ['tariffs'], platform: 'x' })
    ];
    const counts = { russia: 1, greenland: 1, china: 1, middle_east: 1, eu_nato: 1, us_domestic: 2, ukraine: 0 };
    const D = '(демо / demo)';
    const lv = {
      green: { level: 'green', day: 'asleep' },
      yellow: { level: 'yellow', day: 'awake', ukraine: 1 },
      orange: { level: 'orange', day: 'awake', ukraine: 3, until: 5 },
      white: { level: 'white', day: 'awake', ukraine: 2, until: 0.5 },
      greenland: { level: 'green', day: 'busy_elsewhere', region: 'greenland', counts: { greenland: 6 } },
      california: { level: 'green', day: 'busy_elsewhere', region: 'us_domestic', us_state: 'California', counts: { us_domestic: 7 } }
    }[level] || { level: 'green', day: 'asleep' };
    const c = Object.assign({}, counts, lv.counts || {}, { ukraine: lv.ukraine || 0 });
    const regions = {};
    Object.keys(REGIONS).forEach(k => {
      const latest = st.find(s => s.region === k && s.status === 'published');
      regions[k] = { count: c[k] || 0, latest_statement_id: c[k] && latest ? latest.id : null, alert: k === 'ukraine' || k === 'russia', us_states: k === 'us_domestic' && c[k] ? { California: c[k] } : {} };
    });
    const focus = lv.region || (lv.ukraine ? 'ukraine' : null);
    return {
      statements: st,
      status: normaliseStatus({
        alert: { level: lv.level, until: lv.until ? new Date(now + lv.until * 3600e3).toISOString() : null, jokes_off: false,
          based_on: 'placeholder reason ' + D, based_on_uk: 'тут буде підстава ' + D, statement_id: lv.level === 'orange' ? 'demo-1' : null },
        day: { state: lv.day, region: lv.region || null, us_state: lv.us_state || null, delay_note: true,
          based_on: 'placeholder reason ' + D, based_on_uk: 'тут буде підстава ' + D },
        counters: { baseline_24h: '2024-11-05' }
      }),
      globe: { regions, focus, focus_us_state: lv.us_state || null },
      updatedAt: new Date(now).toISOString(),
      failed: false
    };
  }

  // ---------- globe (d3 orthographic on canvas; from the mockup) ----------
  const ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const Globe = (function () {
    let geo = null, loading = null;
    let wrap, canvas, ctx, proj, path, w = 0, raf = 0, ro = null;
    let rot = [-20, -30, 0], dragging = false, lastT = 0, anim = null;
    let counts = {}, opts = {}, colors = {};
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const US_CENTRE = [-98, 39];

    function load() {
      if (geo) return Promise.resolve(geo);
      if (loading) return loading;
      if (!window.d3 || !window.topojson) return Promise.reject(new Error('d3 not loaded'));
      loading = d3.json(ATLAS_URL).then(topo => {
        const all = topojson.feature(topo, topo.objects.countries).features;
        const regions = {};
        Object.keys(REGIONS).forEach(k => {
          const fc = { type: 'FeatureCollection', features: all.filter(f => REGIONS[k].ids.includes(f.id)) };
          let big = fc.features[0], ba = 0;
          fc.features.forEach(f => { const a = d3.geoArea(f); if (a > ba) { ba = a; big = f; } });
          regions[k] = { fc, anchor: k === 'eu_nato' ? [10, 50] : (big ? d3.geoCentroid(big) : [0, 0]) };
        });
        geo = { land: topojson.feature(topo, topo.objects.land), borders: topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b), regions };
        return geo;
      });
      loading.catch(() => { loading = null; });
      return loading;
    }
    function readColors() {
      const cs = getComputedStyle(document.documentElement);
      const v = n => cs.getPropertyValue(n).trim();
      colors = { ocean: v('--ocean'), land: v('--land'), dim: v('--land-dim'), line: v('--border-line'), orange: v('--orange'), calm: v('--calm'), yellow: v('--yellow'), text: v('--text'), surface: v('--surface') };
    }
    function resize() {
      const r = wrap.getBoundingClientRect();
      w = Math.max(100, Math.floor(r.width));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = w * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      proj.scale(w / 2 - 3).translate([w / 2, w / 2]);
    }
    function focusCoord() {
      if (!geo) return null;
      if (opts.focus === 'us_domestic' && opts.usState && stateCoord(opts.usState)) return stateCoord(opts.usState);
      return opts.focus && geo.regions[opts.focus] ? geo.regions[opts.focus].anchor : geo.regions.ukraine.anchor;
    }
    function focusTo() {
      const c = focusCoord();
      if (!c) return;
      const from = rot.slice(), to = [-c[0], -c[1], 0];
      let d = (to[0] - from[0]) % 360; if (d > 180) d -= 360; if (d < -180) d += 360;
      to[0] = from[0] + d;
      if (reduce) { rot = to; return; }
      anim = { t0: performance.now(), dur: 900, i: d3.interpolate(from, to) };
    }
    function visible(c) { return d3.geoDistance(c, [-rot[0], -rot[1]]) < Math.PI / 2 - 0.05; }
    function anchorOf(k) { return k === 'us_domestic' && opts.usState ? US_CENTRE : geo.regions[k].anchor; }
    function draw(now) {
      if (!ctx) return;
      const pulse = reduce ? 1 : 0.5 + 0.5 * Math.sin(now / 420);
      proj.rotate(rot);
      ctx.clearRect(0, 0, w, w);
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = colors.ocean; ctx.fill();
      ctx.beginPath(); path(geo.land); ctx.fillStyle = colors.land; ctx.fill();
      Object.keys(geo.regions).forEach(k => {
        if (k === 'ukraine' || !(counts[k] || 0)) return;
        const hi = opts.elsewhere === k;
        ctx.beginPath(); path(geo.regions[k].fc);
        ctx.fillStyle = colors.calm;
        ctx.globalAlpha = hi ? 0.75 + 0.25 * pulse : 0.55;
        ctx.fill(); ctx.globalAlpha = 1;
      });
      // Ukraine: pulses orange only in 🟠; otherwise dim with a faint outline.
      ctx.beginPath(); path(geo.regions.ukraine.fc);
      if (opts.ukraine === 'orange') {
        ctx.save();
        ctx.shadowColor = colors.orange; ctx.shadowBlur = 4 + 10 * pulse;
        ctx.fillStyle = colors.orange; ctx.globalAlpha = 0.6 + 0.4 * pulse; ctx.fill();
        ctx.restore();
      } else if (opts.ukraine === 'yellow') {
        ctx.fillStyle = colors.yellow; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = colors.dim; ctx.fill();
        ctx.strokeStyle = colors.orange; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.beginPath(); path(geo.borders); ctx.strokeStyle = colors.line; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = colors.calm; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      // Marker on a US state when the data names one.
      const sc = opts.usState && stateCoord(opts.usState);
      if (sc && (counts.us_domestic || 0) && visible(sc)) {
        const p = proj(sc);
        ctx.beginPath(); ctx.arc(p[0], p[1], 4 + 3 * pulse, 0, 2 * Math.PI);
        ctx.fillStyle = colors.surface; ctx.fill(); ctx.strokeStyle = colors.calm; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.font = '600 11px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      Object.keys(geo.regions).forEach(k => {
        const n = counts[k] || 0;
        if (!n) return;
        const c = anchorOf(k);
        if (!visible(c)) return;
        const p = proj(c);
        ctx.beginPath(); ctx.arc(p[0], p[1], 10, 0, 2 * Math.PI);
        ctx.fillStyle = k === 'ukraine' ? colors.orange : colors.surface; ctx.fill();
        ctx.strokeStyle = k === 'ukraine' ? colors.orange : colors.calm; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = k === 'ukraine' ? '#1b1206' : colors.text; ctx.fillText(String(n), p[0], p[1] + 0.5);
      });
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = lastT ? Math.min(now - lastT, 50) : 16;
      lastT = now;
      if (anim) {
        const k = Math.min(1, (now - anim.t0) / anim.dur);
        rot = anim.i(d3.easeCubicInOut(k));
        if (k >= 1) anim = null;
      } else if (!dragging && !reduce) {
        rot[0] += dt * 0.004;
      }
      draw(now);
    }
    function hit(px, py) {
      const p = proj.invert([px, py]);
      if (p && visible(p)) {
        for (const k of Object.keys(geo.regions)) if (d3.geoContains(geo.regions[k].fc, p)) return k;
      }
      let best = null, bd = 18;
      Object.keys(geo.regions).forEach(k => {
        if (!(counts[k] || 0)) return;
        const c = anchorOf(k);
        if (!visible(c)) return;
        const q = proj(c), d = Math.hypot(q[0] - px, q[1] - py);
        if (d < bd) { bd = d; best = k; }
      });
      return best;
    }
    function mount(container, o) {
      unmount();
      wrap = container; opts = o; counts = o.counts;
      canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', t('globeTitle'));
      wrap.appendChild(canvas);
      ctx = canvas.getContext('2d');
      proj = d3.geoOrthographic().clipAngle(90).precision(0.6);
      path = d3.geoPath(proj, ctx);
      readColors(); resize();
      if ('ResizeObserver' in window) { ro = new ResizeObserver(resize); ro.observe(wrap); }
      d3.select(canvas).call(d3.drag().clickDistance(6)
        .on('start', () => { dragging = true; anim = null; })
        .on('drag', ev => {
          const k = 90 / proj.scale();
          rot[0] += ev.dx * k * 1.4;
          rot[1] = Math.max(-75, Math.min(75, rot[1] - ev.dy * k * 1.4));
        })
        .on('end', () => { dragging = false; }));
      canvas.addEventListener('click', ev => {
        const r = canvas.getBoundingClientRect();
        const k = hit(ev.clientX - r.left, ev.clientY - r.top);
        if (k && o.onTap) o.onTap(k);
      });
      focusTo();
      lastT = 0;
      raf = requestAnimationFrame(frame);
    }
    function unmount() {
      cancelAnimationFrame(raf); raf = 0;
      if (ro) { ro.disconnect(); ro = null; }
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      canvas = ctx = null;
    }
    return { load, mount, unmount, readColors: () => { if (ctx) readColors(); } };
  })();

  // ---------- DOM ----------
  const $ = s => document.querySelector(s);
  const view = $('#view');
  const sheet = $('#sheet'), backdrop = $('#sheetBackdrop'), toastEl = $('#toast');
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toast.tm); toast.tm = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }
  function openSheet(html) {
    sheet.innerHTML = '<div class="grab"></div>' + html;
    sheet.hidden = false; backdrop.hidden = false;
    const c = sheet.querySelector('[data-close]');
    if (c) c.focus();
  }
  function closeSheet() { sheet.hidden = true; backdrop.hidden = true; sheet.innerHTML = ''; }
  backdrop.addEventListener('click', closeSheet);
  sheet.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });

  // ---------- chrome ----------
  function effectiveTheme() {
    if (state.theme) return state.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme() {
    if (state.theme) document.documentElement.setAttribute('data-theme', state.theme);
    else document.documentElement.removeAttribute('data-theme');
    const dark = effectiveTheme() === 'dark';
    const b = $('#themeBtn');
    b.textContent = dark ? '☀️' : '🌙';
    b.setAttribute('aria-label', dark ? t('themeLight') : t('themeDark'));
    b.title = b.getAttribute('aria-label');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0d1829' : '#f5f3ee');
    Globe.readColors();
  }
  function renderChrome() {
    document.documentElement.lang = state.lang === 'uk' ? 'uk' : 'en';
    document.title = t('appName') + (DEMO ? ' · demo' : '');
    $('#brand').innerHTML = ICON + '<span>' + esc(t('appName')) + '</span>';
    const lb = $('#langBtn');
    lb.innerHTML = state.lang === 'uk' ? '<b>UA</b> · EN' : 'UA · <b>EN</b>';
    lb.setAttribute('aria-label', state.lang === 'uk' ? 'Switch to English' : 'Перемкнути на українську');
    const db = $('#demoBanner');
    db.hidden = !DEMO; db.textContent = DEMO ? t('demoBanner') : '';
    const tabs = [['', '🏠', 'tabHome'], ['feed', '📰', 'tabFeed'], ['notify', '🔔', 'tabNotify'], ['about', 'ℹ️', 'tabAbout']];
    $('#tabbar').innerHTML = tabs.map(([r, i, k]) => '<a href="#/' + r + '" data-tab="' + r + '"><span class="ico" aria-hidden="true">' + i + '</span>' + esc(t(k)) + '</a>').join('');
    applyTheme();
  }
  $('#langBtn').addEventListener('click', () => { state.lang = state.lang === 'uk' ? 'en' : 'uk'; store.set('lang', state.lang); renderChrome(); route(); });
  $('#themeBtn').addEventListener('click', () => {
    state.theme = effectiveTheme() === 'dark' ? 'light' : 'dark'; store.set('theme', state.theme); applyTheme();
  });
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (!state.theme) applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
  const footer = () => {
    const d = state.data, u = d && parseT(d.updatedAt);
    return (u ? '<p class="data-stamp">' + esc(t('updated', { time: fmtDateTime(new Date(u), KYIV) })) + '</p>' : '') +
      '<footer class="disclaimer">' + esc(t('disclaimer')) + '</footer>';
  };
  const emptyBlock = sub => '<div class="empty"><div class="placeholder">' + esc(t('emptyTitle')) + '</div>' + (sub ? '<div class="small">' + esc(sub) + '</div>' : '') + '</div>';
  const failNotice = () => state.data && state.data.failed ? '<div class="notice">' + esc(t('loadFail')) + '</div>' : '';

  // ---------- statement bits ----------
  const localBased = o => o ? (state.lang === 'uk' ? (o.based_on_uk || o.based_on) : (o.based_on || o.based_on_uk)) : null;
  // Retract reasons are free text from the maintainer (pipeline/retract.py), shown as written.
  const reasonText = r => String(r || '—');
  const showsOrangeBadge = s => isLive(s) && s.triggers_alert && !s.is_paraphrase && !s.victims_flag;
  function quoteHTML(s) { // feed / preview line
    if (s.status === 'retracted') return '<div class="quote">' + esc(t('retracted', { reason: reasonText(s.retract_reason) })) + '</div>';
    const main = '<div class="quote" lang="en">' + (s.is_paraphrase ? esc(s.quote_en) : '«' + esc(s.quote_en) + '»') + '</div>';
    const uk = state.lang === 'uk' && s.quote_uk ? '<div class="quote-uk" lang="uk">' + esc(s.quote_uk) + ' <span class="tiny">· ' + esc(t('mt')) + '</span></div>' : '';
    return main + uk;
  }
  function itemCard(s) {
    const badges = ['<span class="badge region">' + esc(regionName(s.region, s.us_state)) + '</span>'];
    if (showsOrangeBadge(s)) badges.push('<span class="badge orange">🟠</span>');
    if (s.is_paraphrase) badges.push('<span class="badge paraphrase">' + esc(t('paraphrase')) + '</span>');
    (s.topics || []).forEach(tp => badges.push('<span class="badge">#' + esc(topicName(tp)) + '</span>'));
    const at = parseT(s.said_at);
    return '<a class="card item' + (s.status === 'retracted' ? ' retracted' : '') + '" href="#/s/' + encodeURIComponent(s.id) + '" data-id="' + esc(s.id) + '">' +
      '<div class="meta">' + (at ? esc(fmtDateTime(new Date(at), KYIV)) + ' · ' : '') + esc(platformName(s.platform)) + '</div>' +
      quoteHTML(s) +
      '<div class="tags">' + badges.join('') + '</div>' +
      '<div class="meta" style="margin-top:6px">' + esc(outlets(s)) + '</div>' +
    '</a>';
  }

  // ---------- home ----------
  function clocksHTML() {
    const now = new Date();
    const ow = tzOffsetMin(WASH, now), ok = tzOffsetMin(KYIV, now);
    const gap = ow === null || ok === null ? '' : '<span class="muted">' + esc(t('gap', { n: (ok - ow) / 60 })) + '</span>';
    return '<span>🇺🇸 ' + esc(t('washington')) + ' <b>' + fmtTime(now, WASH) + '</b></span><span>🇺🇦 ' + esc(t('kyiv')) + ' <b>' + fmtTime(now, KYIV) + '</b></span>' + gap;
  }
  function counters() {
    const d = state.data, c = d.status.counters;
    const ukr = d.statements.filter(s => isLive(s) && s.triggers_alert && parseT(s.said_at) !== null && parseT(s.said_at) <= Date.now());
    let since = null, week = 0;
    if (ukr.length) {
      since = daysSinceIso(ukr[0].said_at);
      week = ukr.filter(s => parseT(s.said_at) >= Date.now() - 7 * 864e5).length;
    }
    const base = c.baseline_24h || '2024-11-05';
    return { since, week, d24: daysSinceIso(base) };
  }
  function renderHome() {
    const d = state.data, a = d.status.alert, day = d.status.day;
    const level = a.level;
    const busy = day.state === 'busy_elsewhere' && day.region && day.region !== 'ukraine';
    const showSafe = busy && level !== 'orange' && !a.jokes_off;
    const cls = a.jokes_off ? 'lv-white' : (showSafe ? 'lv-elsewhere' : 'lv-' + level);
    const based = localBased(a);
    const untilT = parseT(a.until);
    let untilLine = '';
    if (untilT && level === 'orange') untilLine = t('untilOrange', { time: fmtTime(new Date(untilT), KYIV) });
    if (untilT && level === 'white') untilLine = t('untilWhite', { time: fmtTime(new Date(untilT), KYIV) });
    const latest = d.statements.find(isLive);
    const muted = state.muteUntil > Date.now();
    const cn = counters();
    const g = d.globe.regions || {};
    const gcounts = {};
    Object.keys(REGIONS).forEach(k => { gcounts[k] = (g[k] && +g[k].count) || 0; });

    const demoBtns = DEMO ? '<div class="demo-switch" role="group" aria-label="' + esc(t('demoLevel')) + '"><span class="label">' + esc(t('demoLevel')) + '</span>' +
      [['green', '🟢'], ['yellow', '🟡'], ['orange', '🟠'], ['white', '⚪'], ['greenland', '🌍 ' + REGIONS.greenland.short[state.lang]], ['california', '🌍 ' + stateName('California')]]
        .map(([k, l]) => '<button type="button" data-level="' + k + '" aria-pressed="' + (state.demoLevel === k) + '">' + esc(l) + '</button>').join('') + '</div>' : '';

    const dayState = DAY_STATES.includes(day.state) ? day.state : null;
    const dayBased = localBased(day);

    view.innerHTML = demoBtns + failNotice() +
      '<section class="card level-card ' + cls + '" aria-live="polite" id="levelCard" data-level="' + esc(level) + '">' +
        '<div class="row"><span class="level-emoji" aria-hidden="true">' + LEVEL_EMOJI[level] + '</span>' +
        (a.jokes_off
          ? '<div><div class="level-name">' + esc(t('lvl_neutral')) + '</div><div>' + esc(t('victimsNote')) + '</div></div>'
          : '<div><div class="level-name">' + esc(t('lvl_' + level)) + '</div><div>' + esc(t('tag_' + level)) + '</div></div>') +
        '</div>' +
        (based ? '<div class="level-sub muted">' + esc(t('basedOn', { x: based })) + '</div>' : '') +
        (untilLine ? '<div class="level-sub muted">' + esc(untilLine) + '</div>' : '') +
        (showSafe ? '<div class="safe-line" id="safeLine">' + esc(t('safeTpl', { region: regionDat(day.region, day.us_state) })) + '</div>' : '') +
      '</section>' +

      '<section class="card status-line" id="statusLine">' +
        (dayState ? '<div class="status-main">' + DAY_EMOJI[dayState] + ' ' + esc(t('day_' + dayState, { region: regionDat(day.region, day.us_state) })) + '</div>' : '') +
        '<div class="clocks" id="clocks">' + clocksHTML() + '</div>' +
        '<div class="based-on">' + (dayBased ? esc(t('basedOn', { x: dayBased })) + ' ' : '') + (day.delay_note !== false ? esc(t('delay')) : '') + '</div>' +
      '</section>' +

      '<section class="card globe-card"><h2>🌍 ' + esc(t('globeTitle')) + '</h2>' +
        '<div class="globe-wrap" id="globeWrap"><div class="globe-fallback" id="globeFallback">…</div></div>' +
        '<div class="legend"><span><i style="background:var(--orange)"></i>' + esc(t('lgUkraine')) + '</span>' +
        '<span><i style="background:var(--calm)"></i>' + esc(t('lgOther')) + '</span>' +
        '<span><i style="background:var(--land)"></i>' + esc(t('lgQuiet')) + '</span></div>' +
        '<div class="based-on" style="text-align:center;margin-top:4px">' + esc(t('globeHint')) + '</div>' +
      '</section>' +

      (latest
        ? '<a class="card item" id="latestCard" href="#/s/' + encodeURIComponent(latest.id) + '">' +
            '<div class="row between"><h3>' + esc(t('latest')) + '</h3><span class="badge region">' + esc(regionName(latest.region, latest.us_state)) + '</span></div>' +
            quoteHTML(latest) +
            '<div class="meta">' + esc(fmtDateTime(new Date(parseT(latest.said_at) || 0), KYIV)) + ' · ' + esc(platformName(latest.platform)) + ' · ' + esc(outlets(latest)) + '</div>' +
          '</a>'
        : '<section class="card" id="latestCard">' + emptyBlock() + '</section>') +

      '<div class="counters">' +
        '<div class="counter"><div class="num" id="c1">' + (cn.since === null ? '—' : cn.since) + '</div><div class="lbl">' + esc(t('c1')) + '</div></div>' +
        '<div class="counter"><div class="num" id="c2">' + cn.week + '</div><div class="lbl">' + esc(t('c2')) + '</div></div>' +
        '<div class="counter"><div class="num" id="c24">' + cn.d24 + '</div><div class="lbl" id="c24lbl">' + esc(t('c3', { N: cn.d24 })) + '</div><div class="lbl">' + esc(t('c3base')) + '</div></div>' +
      '</div>' +

      '<button type="button" class="shelter' + (muted ? ' on' : '') + '" id="grassBtn" aria-pressed="' + muted + '">' +
        '<span class="ico" aria-hidden="true">' + (muted ? '🌱' : '🌿') + '</span><span>' +
        (muted
          ? '<span class="t">' + esc(t('grassOn', { time: fmtDateTime(new Date(state.muteUntil), KYIV) })) + '</span><br><span class="s">' + esc(t('grassCancel')) + '</span>'
          : '<span class="t">' + esc(t('grass')) + '</span><br><span class="s">' + esc(t('grassSub')) + '</span>') +
        '</span></button>' +
      footer();

    view.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => {
      state.demoLevel = b.getAttribute('data-level'); state.data = demoData(state.demoLevel); renderHome();
    }));
    $('#grassBtn').addEventListener('click', () => {
      state.muteUntil = state.muteUntil > Date.now() ? 0 : Date.now() + MUTE_MS;
      store.set('muteUntil', state.muteUntil); renderHome();
    });

    const gw = $('#globeWrap'), fb = $('#globeFallback');
    const focus = d.globe.focus || (level === 'orange' || level === 'yellow' ? 'ukraine' : null);
    const elsewhere = busy ? day.region : (focus && focus !== 'ukraine' && focus !== 'russia' ? focus : null);
    Globe.load().then(() => {
      if (!document.body.contains(gw)) return;
      fb.remove();
      Globe.mount(gw, {
        counts: gcounts,
        ukraine: level === 'orange' && !a.jokes_off ? 'orange' : (level === 'yellow' ? 'yellow' : null),
        elsewhere, focus: elsewhere || focus || 'ukraine',
        usState: d.globe.focus_us_state || (busy ? day.us_state : null),
        onTap: k => regionSheet(k, gcounts)
      });
    }).catch(() => { if (fb) fb.textContent = t('globeFail'); });
  }

  function regionSheet(k, counts) {
    const d = state.data, g = (d.globe.regions || {})[k] || {};
    const n = counts[k] || 0;
    const st = g.latest_statement_id ? byId(g.latest_statement_id) : null;
    const usState = k === 'us_domestic' ? (d.globe.focus_us_state || null) : null;
    openSheet(
      '<h3>' + esc(regionName(k, usState)) + '</h3>' +
      '<div class="muted small">' + esc(n ? t('inWindow', { n }) : t('noStatements')) + '</div>' +
      (n && st ? '<div class="card" style="margin-top:10px;box-shadow:none"><div class="small muted">' + esc(t('latest')) + '</div>' +
        quoteHTML(st) +
        '<div class="small">' + (st.sources || []).map(x => '<a href="' + esc(safeUrl(x.url)) + '" target="_blank" rel="noopener">' + esc(x.outlet) + ' ↗</a>').join(' · ') + '</div></div>' : '') +
      '<div class="row wrap" style="margin-top:10px">' +
        (n && st ? '<a class="btn" href="#/s/' + encodeURIComponent(st.id) + '">' + esc(t('open')) + '</a>' : '') +
        '<button type="button" class="btn" id="sheetFeed">' + esc(t('openFeed')) + '</button>' +
        '<button type="button" class="btn" data-close>' + esc(t('close')) + '</button></div>'
    );
    $('#sheetFeed').addEventListener('click', () => { state.feed = { region: k, topic: 'all', q: '' }; closeSheet(); location.hash = '#/feed'; });
  }

  // ---------- feed ----------
  function searchText(s) {
    // Retracted items are searchable only by reason, the retracted label and outlets, never by the withdrawn quote.
    const parts = s.status === 'retracted'
      ? [s.retract_reason, T.uk.retracted.replace('{reason}', ''), T.en.retracted.replace('{reason}', ''), outlets(s)]
      : [s.quote_en, s.quote_uk, outlets(s)];
    if (REGIONS[s.region]) parts.push(REGIONS[s.region].uk, REGIONS[s.region].en);
    if (s.us_state) parts.push(s.us_state, US_STATES[s.us_state] ? US_STATES[s.us_state][0] : '');
    (s.topics || []).forEach(tp => parts.push(tp, TOPICS[tp] ? TOPICS[tp].uk : '', TOPICS[tp] ? TOPICS[tp].en : ''));
    const p = PLATFORMS[s.platform] || PLATFORMS.unknown; parts.push(p.uk, p.en);
    if (s.is_paraphrase) parts.push(T.uk.paraphrase, T.en.paraphrase);
    return parts.filter(Boolean).join(' ').toLowerCase();
  }
  function renderFeed() {
    const f = state.feed, all = state.data.statements;
    const regionOpts = '<option value="all">' + esc(t('allRegions')) + '</option>' +
      Object.keys(REGIONS).map(k => '<option value="' + k + '"' + (f.region === k ? ' selected' : '') + '>' + esc(REGIONS[k][state.lang]) + '</option>').join('');
    const topicChips = ['all'].concat(Object.keys(TOPICS)).map(k =>
      '<button type="button" class="chip" data-topic="' + k + '" aria-pressed="' + (f.topic === k) + '">' + esc(k === 'all' ? t('allTopics') : '#' + topicName(k)) + '</button>').join('');
    view.innerHTML = failNotice() +
      '<h1 style="font-size:22px;margin:4px 0 10px">' + esc(t('feedTitle')) + '</h1>' +
      '<input type="search" class="search" id="q" placeholder="' + esc(t('searchPh')) + '" value="' + esc(f.q) + '" aria-label="' + esc(t('searchPh')) + '">' +
      '<div class="row" style="margin-top:8px"><select class="select" id="regionSel" aria-label="' + esc(t('fRegion')) + '">' + regionOpts + '</select></div>' +
      '<div class="chips" role="group" aria-label="' + esc(t('fTopics')) + '">' + topicChips + '</div>' +
      '<div id="list"></div>' + footer();
    const drawList = () => {
      const q = f.q.trim().toLowerCase();
      const items = all.filter(s => (f.region === 'all' || s.region === f.region) &&
        (f.topic === 'all' || (s.topics || []).includes(f.topic)) && (!q || searchText(s).includes(q)));
      $('#list').innerHTML = items.length ? items.map(itemCard).join('') : emptyBlock(all.length ? t('emptySub') : '');
    };
    $('#q').addEventListener('input', e => { f.q = e.target.value; drawList(); });
    $('#regionSel').addEventListener('change', e => { f.region = e.target.value; drawList(); });
    view.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => {
      f.topic = b.getAttribute('data-topic');
      view.querySelectorAll('[data-topic]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      drawList();
    }));
    drawList();
  }

  // ---------- statement detail ----------
  function renderDetail(id) {
    const s = byId(id);
    if (!s) { view.innerHTML = '<a class="back" href="#/feed">' + esc(t('back')) + '</a><div class="empty">' + esc(t('notFound')) + '</div>' + footer(); return; }
    let body = '';
    if (s.status === 'retracted') {
      body = '<div class="notice" id="retractNotice">🚫 ' + esc(t('retracted', { reason: reasonText(s.retract_reason) })) + '</div>';
    } else {
      if (s.victims_flag) body += '<div class="notice" id="victimsNotice">' + esc(t('victimsNote')) + '</div>';
      if (s.is_paraphrase) {
        body += '<div class="notice"><span class="badge paraphrase">' + esc(t('paraphrase')) + '</span> ' + esc(t('paraphraseNote')) + '</div>' +
          '<div class="small muted" style="margin-bottom:4px">' + esc(t('paraphraseSrc')) + '</div>' +
          '<p style="margin:0" lang="en">' + esc(s.quote_en) + '</p>';
      } else {
        body += '<div class="small muted" style="margin-bottom:4px">' + esc(t('original')) + '</div>' +
          '<blockquote class="q" lang="en">' + esc(s.quote_en) + '</blockquote>';
      }
      body += s.quote_uk
        ? '<div class="translation"><div class="small muted">' + esc(t('translation')) + ' · <span class="badge">' + esc(t('mt')) + '</span></div>' +
          '<p style="margin:6px 0 0" lang="uk">' + esc(s.quote_uk) + '</p></div>'
        : '<div class="translation small muted" id="noTranslation">' + esc(t('noTranslation')) + '</div>';
    }
    const at = parseT(s.said_at);
    view.innerHTML =
      '<a class="back" href="#/feed">' + esc(t('back')) + '</a>' +
      '<section class="card" id="detailBody">' + body + '</section>' +
      '<section class="card"><dl class="kv">' +
        '<dt>' + esc(t('fDate')) + '</dt><dd>' + (at ? esc(fmtDateTime(new Date(at), KYIV)) : '—') + '</dd>' +
        '<dt>' + esc(t('fPlatform')) + '</dt><dd>' + esc(platformName(s.platform)) + '</dd>' +
        '<dt>' + esc(t('fRegion')) + '</dt><dd>' + esc(regionName(s.region, s.us_state)) + '</dd>' +
        ((s.topics || []).length ? '<dt>' + esc(t('fTopics')) + '</dt><dd>' + s.topics.map(tp => '<span class="badge">#' + esc(topicName(tp)) + '</span>').join(' ') + '</dd>' : '') +
      '</dl></section>' +
      '<section class="card"><h3>' + esc(t('fSources')) + '</h3><ul class="sources">' +
        (s.sources || []).map(x => '<li><a href="' + esc(safeUrl(x.url)) + '" target="_blank" rel="noopener">' + esc(x.outlet) + ' ↗</a> ' +
          (x.primary ? '<span class="badge primary-src">' + esc(t('primary')) + '</span> ' : '') +
          '<span class="tiny muted">' + esc(hostOf(x.url)) + '</span></li>').join('') +
      '</ul></section>' +
      '<div class="row" style="gap:10px">' +
        '<button type="button" class="btn" id="reportBtn" style="flex:1">⚑ ' + esc(t('report')) + '</button>' +
        '<button type="button" class="btn primary" id="shareBtn" style="flex:1">↗ ' + esc(t('share')) + '</button></div>' +
      footer();
    $('#reportBtn').addEventListener('click', () => openSheet('<h3>' + esc(t('report')) + '</h3><p>' + esc(t('reportText')) + '</p>' +
      '<a class="btn block primary" style="margin-bottom:8px" href="mailto:' + EMAIL + '?subject=' + encodeURIComponent('Orange Alert: error report ' + s.id) + '&body=' + encodeURIComponent(location.href) + '">✉️ ' + esc(EMAIL) + '</a>' +
      '<button type="button" class="btn block" data-close>' + esc(t('close')) + '</button>'));
    $('#shareBtn').addEventListener('click', async () => {
      const url = location.href;
      try {
        if (navigator.share) { await navigator.share({ title: t('appName'), url }); return; }
        await navigator.clipboard.writeText(url); toast(t('copied'));
      } catch (e) { if (!(e && e.name === 'AbortError')) toast(url); }
    });
  }

  // ---------- notification settings (UI only; push is phase 4) ----------
  function sw(id, on) { return '<label class="switch"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span></span></label>'; }
  function setting(id, title, desc, on) {
    return '<div class="setting"><div><label for="' + id + '"><b>' + esc(title) + '</b></label><div class="desc">' + esc(desc) + '</div></div>' + sw(id, on) + '</div>';
  }
  function renderNotify() {
    const n = state.notify;
    view.innerHTML =
      '<h1 style="font-size:22px;margin:4px 0 10px">' + esc(t('nTitle')) + '</h1>' +
      '<div class="notice">📱 ' + esc(t('nIos')) + '</div>' +
      '<section class="card">' +
        setting('nOn', t('nMaster'), t('nMasterD'), n.on) +
        setting('nDigest', t('nDigest'), t('nDigestD'), n.digest) +
        setting('nOrange', t('nOrange'), t('nOrangeD'), n.perOrange) +
      '</section>' +
      '<div class="section-title">' + esc(t('nTopics')) + '</div>' +
      '<section class="card">' +
        setting('nTUA', t('nTopicUA'), t('nTopicUAD'), n.tUkraine) +
        setting('nTRU', t('nTopicRU'), t('nTopicRUD'), n.tRussia) +
        '<div class="desc small muted" style="padding-top:8px">' + esc(t('nOther')) + '</div>' +
      '</section>' +
      '<section class="card"><b>' + esc(t('nQuiet')) + '</b><div class="desc small muted">' + esc(t('nQuietD')) + '</div>' +
        '<div class="row wrap" style="margin-top:8px"><label>' + esc(t('nFrom')) + ' <input type="time" id="qFrom" value="' + esc(n.qFrom) + '"></label>' +
        '<label>' + esc(t('nTo')) + ' <input type="time" id="qTo" value="' + esc(n.qTo) + '"></label></div></section>' +
      '<div class="notice">ℹ️ ' + esc(t('nCap')) + '</div>' +
      '<div class="section-title">' + esc(t('nPreview')) + '</div>' +
      '<div class="push-preview"><span class="app-ico">' + ICON + '</span><div><div class="ttl" lang="uk">' + esc(t('pushTitle')) + '</div>' +
        '<div class="small" lang="uk">' + esc(t('pushBody')) + '</div></div></div>' +
      '<div class="push-preview" style="margin-top:8px"><span class="app-ico">' + ICON + '</span><div><div class="ttl" lang="uk">' + esc(t('digestTitle')) + '</div>' +
        '<div class="small" lang="uk">' + esc(t('digestBody')) + '</div></div></div>' +
      (t('pushLangNote') ? '<p class="tiny muted">' + esc(t('pushLangNote')) + '</p>' : '') +
      '<p class="tiny muted">' + esc(t('nNotYet')) + '</p>' + footer();
    const bind = (id, key) => $('#' + id).addEventListener('change', e => { n[key] = e.target.checked; store.set('notify', n); syncDisabled(); });
    bind('nOn', 'on'); bind('nDigest', 'digest'); bind('nOrange', 'perOrange'); bind('nTUA', 'tUkraine'); bind('nTRU', 'tRussia');
    $('#qFrom').addEventListener('change', e => { n.qFrom = e.target.value; store.set('notify', n); });
    $('#qTo').addEventListener('change', e => { n.qTo = e.target.value; store.set('notify', n); });
    // Everything (topic toggles included) is disabled only when the master switch is off.
    function syncDisabled() {
      ['nDigest', 'nOrange', 'nTUA', 'nTRU', 'qFrom', 'qTo'].forEach(id => { $('#' + id).disabled = !n.on; });
    }
    syncDisabled();
  }

  // ---------- about ----------
  function renderAbout() {
    view.innerHTML =
      '<div class="about">' +
      '<h1 style="font-size:22px;margin:4px 0 10px">' + esc(t('aTitle')) + '</h1>' +
      '<section class="card"><p style="margin:0;font-weight:700;font-size:17px">' + esc(t('disclaimer')) + '</p>' +
        '<p class="small muted" style="margin:8px 0 0">' + esc(t('aAff')) + '</p>' +
        '<p class="small muted" style="margin:6px 0 0">' + esc(t('aSafety')) + '</p></section>' +
      '<section class="card"><h3>' + esc(t('aHow')) + '</h3><ul class="small">' +
        ['aHow1', 'aHow2', 'aHow3', 'aHow4', 'aHow5'].map(k => '<li>' + esc(t(k)) + '</li>').join('') + '</ul></section>' +
      '<section class="card"><h3>' + esc(t('aSources')) + '</h3><p class="small" style="margin:0">' + esc(t('aSourcesT')) + '</p>' +
        '<p class="small" style="margin:6px 0 0"><a href="' + REPO_URL + '/blob/main/docs/SOURCES.md" target="_blank" rel="noopener">' + esc(t('aSourcesLink')) + ' ↗</a></p></section>' +
      '<section class="card"><h3>' + esc(t('aReport')) + '</h3><p class="small" style="margin:0">✉️ ' + esc(t('aReportT')) + '</p>' +
        '<a class="btn" style="margin-top:8px" href="mailto:' + EMAIL + '?subject=' + encodeURIComponent('Orange Alert: error report') + '">' + esc(EMAIL) + '</a></section>' +
      '<p class="tiny muted" style="text-align:center"><a href="' + REPO_URL + '" target="_blank" rel="noopener">' + esc(t('aCode')) + '</a></p>' +
      '</div>' + footer();
  }

  // ---------- router ----------
  function route() {
    if (!state.loaded) return;
    const h = location.hash.replace(/^#\/?/, '');
    const i = h.indexOf('/');
    const name = i < 0 ? h : h.slice(0, i), arg = i < 0 ? '' : decodeURIComponent(h.slice(i + 1));
    Globe.unmount();
    closeSheet();
    if (name === 'feed') renderFeed();
    else if (name === 's') renderDetail(arg);
    else if (name === 'notify') renderNotify();
    else if (name === 'about') renderAbout();
    else renderHome();
    const tab = name === 's' ? 'feed' : (['feed', 'notify', 'about'].includes(name) ? name : '');
    document.querySelectorAll('#tabbar a').forEach(a => {
      const on = a.getAttribute('data-tab') === tab;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // Live clocks and counters; mute expiry.
  setInterval(() => {
    const c = document.getElementById('clocks');
    if (c) c.innerHTML = clocksHTML();
    const b = document.getElementById('grassBtn');
    if (b && b.getAttribute('aria-pressed') === 'true' && state.muteUntil <= Date.now()) renderHome();
  }, 15000);

  // Refresh data in the background; re-render only the home screen (keeps feed input focus).
  async function refresh() {
    if (DEMO || document.hidden) return;
    const before = state.data && state.data.updatedAt;
    await loadData();
    if (state.data.updatedAt !== before && /^#?\/?$/.test(location.hash) && sheet.hidden) route();
  }
  setInterval(refresh, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* offline shell is optional */ }); });
  }

  renderChrome();
  view.innerHTML = '<div class="empty">…</div>';
  loadData().then(route);
})();
