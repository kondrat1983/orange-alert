/* Orange Alert: clickable static mockup.
 * All data below is placeholder. There are NO quotes in this file, on purpose:
 * real quotes come only from the pipeline, with sources (SPEC 3, 6).
 * Joke texts are drafts from docs/TEXTS.md, awaiting Kondrat's approval.
 */
(function () {
  'use strict';

  // ---------- storage (per-viewer convenience only) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('oa.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('oa.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  const NOTIFY_DEFAULTS = { on: true, digest: true, perOrange: false, tUkraine: true, tRussia: true, qFrom: '22:00', qTo: '10:00' };
  const state = {
    lang: store.get('lang', 'uk') === 'en' ? 'en' : 'uk',
    theme: store.get('theme', null),
    icon: store.get('icon', 'a'),
    level: 'orange',
    dayOverride: null,
    feed: { region: 'all', topic: 'all', q: '' },
    notify: Object.assign({}, NOTIFY_DEFAULTS, store.get('notify', {})),
    muteUntil: store.get('muteUntil', 0)
  };

  // ---------- texts ----------
  const T = {
    uk: {
      appName: 'Помаранчева тривога',
      demoBanner: 'Макет: дані — заглушки, цитат немає, тексти — чернетка',
      tabHome: 'Головна', tabFeed: 'Стрічка', tabNotify: 'Сповіщення', tabAbout: 'Про проєкт',
      demoLevel: 'Демо: перемкніть рівень',
      lvl_green: 'Тиша.', tag_green: 'Трамп про Україну мовчить. Користуйтеся моментом.',
      lvl_yellow: 'Увага!', tag_yellow: 'У Вашингтоні прокинувся Дональд Трамп. Тримайтеся подалі від стрічки новин.',
      lvl_orange: 'Помаранчева тривога!', tag_orange: 'Трамп говорить про Україну. Масова евакуація з інтернету! Пройдіть до найближчого офлайну.',
      lvl_white: 'Відбій.', tag_white: 'Можна повертатися в інтернет. Можливі повторні заяви.',
      sub_green: 'За останні 24 год заяв про Україну не виявлено (демо).',
      sub_yellow: 'Причина: переказ без прямої цитати, чекаємо другого джерела (демо).',
      sub_orange: 'Остання заява про Україну о {time} (Київ). Рівень триває 6 год після останньої заяви.',
      sub_white: '🟠 завершилась. ⚪ показується 1 год, потім 🟢. На ⚪ сповіщень немає.',
      sub_elsewhere: 'Заяв про Україну за 24 год: 0. Уся увага — на іншому регіоні (демо).',
      safeTpl: 'Ми в безпеці: сьогодні дісталося {region}. Видихаємо 😮‍💨',
      day_asleep: 'Трамп спить. Інтернет у безпеці.',
      day_woke: 'У Вашингтоні прокинувся Трамп. Чекаємо.',
      day_mic: 'Трамп біля мікрофона. Відійдіть від екранів.',
      day_night: 'Нічний постинг. Truth Social під загрозою.',
      day_busy: 'Ми в безпеці: сьогодні дісталося {region}. Видихаємо 😮‍💨',
      based_asleep: 'Підстава: публічної активності з 00:00 за Вашингтоном не виявлено (демо).',
      based_woke: 'Підстава: перший виявлений пост о 06:12 за Вашингтоном (за даними Example News, демо).',
      based_mic: 'Підстава: за публічним розкладом Білого дому (демо).',
      based_night: 'Підстава: пости о 01:40 за Вашингтоном (за даними Example News, демо).',
      based_busy: 'Підстава: за 24 год {n} заяв про {region}, 0 — про Україну (демо).',
      delay: 'Дані надходять із затримкою 10–60 хв.',
      tapCycle: 'Торкніться, щоб перемкнути стан (демо)',
      washington: 'Вашингтон', kyiv: 'Київ', gap: 'різниця {n} год',
      globeTitle: 'Куди дивиться Трамп · 24 год',
      globeHint: 'Тягніть, щоб обертати. Торкніться підсвіченого регіону.',
      globeFail: 'Глобус не завантажився. Потрібен інтернет.',
      lgUkraine: 'Україна', lgOther: 'інші регіони', lgQuiet: 'тихо',
      nStatements: '{n} заяв за 24 год (демо)',
      noStatements: 'За 24 год заяв немає (демо).',
      latest: 'Остання заява',
      openFeed: 'Відкрити в стрічці', close: 'Закрити', open: 'Відкрити',
      quotePh: '«Тут буде дослівна цитата англійською»',
      transPh: '«Тут буде український переклад»',
      summaryPh: 'Наш короткий опис заяви (заглушка)',
      sourcePh: 'Джерело: Example News',
      c1: 'днів від останньої заяви про Україну',
      c2: 'заяв про Україну за 7 днів',
      c3: '24 години тривають уже {N} днів', c3base: 'база: 05.11.2024',
      c3link: 'обіцянки',
      shelter: 'Торкнутися трави',
      shelterSub: 'вийти з інтернету на 24 години',
      shelterOn: 'Ви на траві до {time}. Тут тихо.',
      shelterCancel: 'Торкніться, щоб скасувати',
      shelterToast: 'Сповіщення вимкнено на 24 год (демо)',
      gagsTitle: 'Постійні рубрики',
      twTitle: '«Два тижні»',
      twSub: 'Відстежуємо дедлайни «за два тижні» щодо Росії та України.',
      twLine: 'Дедлайн із заяви від {date}, строк {d} днів (демо)',
      twPassed: 'Два тижні минули {n} днів тому',
      twLeft: 'До дедлайну {n} днів',
      statusLbl: 'Статус:',
      pendingConfirm: 'очікує підтвердження',
      tacoTitle: 'TACO-метр',
      tacoSub: 'Погроза → що було далі. Ультиматуми Росії.', tacoPending: 'Чекаємо, чи злякається',
      tacoThreat: 'Погроза (демо): [опис з джерела], {date}',
      tacoOutcome: 'Результат:',
      tacoNote: 'Результат показуємо лише після підтвердження Кондратом.',
      feedTitle: 'Стрічка заяв',
      searchPh: 'Пошук: регіон, тема, джерело…',
      allRegions: 'Усі регіони', allTopics: 'Усі теми',
      emptyTitle: 'Заяв немає. Підозріло.',
      emptySub: 'Нічого не знайдено. Змініть фільтр.',
      paraphrase: 'Переказ',
      paraphraseNote: 'Прямої цитати немає, лише переказ із джерела. Переказ не вмикає 🟠.',
      retracted: 'Відкликано: {reason}',
      victimsNote: 'Тема: жертви. Жартівливе оформлення (рівні, бейджі) для цього запису вимкнено.',
      back: '← Назад',
      fDate: 'Дата і час (Київ)', fPlatform: 'Платформа', fRegion: 'Регіон', fTopics: 'Теми', fSources: 'Джерела',
      mt: 'машинний переклад',
      original: 'Оригінал (EN)', translation: 'Переклад (UA)',
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
      nIos: 'iPhone: сповіщення працюють лише після «Поділитися» → «На початковий екран». Потім відкрийте застосунок з іконки.',
      nPreview: 'Так виглядатиме сповіщення',
      pushTitle: '🟠 Помаранчева тривога',
      pushBody: 'Трамп знову говорить про Україну', digestTitle: '🟠 Помаранчева тривога: підсумок дня.', digestBody: 'Україна 3, Гренландія 1', pushLangNote: '',
      nDemo: 'У макеті налаштування зберігаються лише в цьому браузері; справжні пуші ще не працюють.',
      aTitle: 'Про проєкт',
      disclaimer: 'Сатиричний проєкт. Цитати справжні, коментарі наші.',
      aHow: 'Як це працює',
      aHow1: 'Кожні 30 хв скрипт перевіряє новини й стенограми. Без ШІ.',
      aHow2: 'Публікуємо лише дослівні цитати, знайдені у двох незалежних джерелах або в першоджерелі.',
      aHow3: 'Переказ позначаємо «Переказ», і він не вмикає 🟠.',
      aHow4: 'Переклад машинний (Argos Translate); оригінал англійською завжди поруч.',
      aHow5: 'Хибні записи не зникають тихо, а позначаються «Відкликано: причина».',
      aSources: 'Джерела',
      aSourcesT: 'Reuters, AP, BBC, The Guardian, Politico, CNN, Kyiv Independent, Українська правда, Суспільне, Укрінформ, whitehouse.gov. Список ще перевіряється.',
      aReport: 'Повідомити про помилку',
      aReportT: 'Пишіть на {email}: посилання на заяву і що не так.',
      aSafety: 'Це не повітряна тривога: без сирен і без червоного. Справжні тривоги — лише в офіційних застосунках.',
      aAff: 'Проєкт не пов’язаний з жодною державою, партією, медіа чи політиком.',
      aIcon: 'Іконка: оберіть варіант',
      iconA: 'A · сигнальний вогник', iconB: 'B · помаранчевий вихор',
      iconNote: 'Вибір лише для макета. Скажіть, який варіант подобається.',
      aCode: 'Код відкритий, ліцензія MIT.',
      draftNote: 'Чернетка: жартівливі тексти — чернетки, чекають на затвердження Кондратом.',
      themeLight: 'Світла тема', themeDark: 'Темна тема'
    },
    en: {
      appName: 'Orange Alert',
      demoBanner: 'Mockup: placeholder data, no quotes, draft texts',
      tabHome: 'Home', tabFeed: 'Feed', tabNotify: 'Alerts', tabAbout: 'About',
      demoLevel: 'Demo: switch level',
      lvl_green: 'All quiet.', tag_green: 'Trump is silent on Ukraine. Enjoy it while it lasts.',
      lvl_yellow: 'Attention!', tag_yellow: 'Donald Trump has woken up in Washington. Stay away from your news feed.',
      lvl_orange: 'Orange alert!', tag_orange: 'Trump is talking about Ukraine. Mass evacuation from the internet! Proceed to the nearest offline.',
      lvl_white: 'All clear.', tag_white: 'You may return to the internet. Repeat statements possible.',
      sub_green: 'No statements about Ukraine detected in the last 24 h (demo).',
      sub_yellow: 'Reason: a paraphrase without a direct quote, waiting for a second source (demo).',
      sub_orange: 'Latest statement about Ukraine at {time} (Kyiv). The level lasts 6 h after the latest statement.',
      sub_white: '🟠 is over. ⚪ shows for 1 h, then 🟢. No notifications on ⚪.',
      sub_elsewhere: 'Statements about Ukraine in 24 h: 0. All attention is on another region (demo).',
      safeTpl: 'We\'re safe: today {region} got it. Exhale 😮‍💨',
      day_asleep: 'Trump is asleep. The internet is safe.',
      day_woke: 'Trump is awake in Washington. We wait.',
      day_mic: 'Trump is at the microphone. Step away from your screens.',
      day_night: 'Night posting. Truth Social under threat.',
      day_busy: 'We\'re safe: today {region} got it. Exhale 😮‍💨',
      based_asleep: 'Based on: no public activity detected since 00:00 Washington time (demo).',
      based_woke: 'Based on: first detected post at 06:12 Washington time (per Example News, demo).',
      based_mic: 'Based on: the White House public schedule (demo).',
      based_night: 'Based on: posts at 01:40 Washington time (per Example News, demo).',
      based_busy: 'Based on: {n} statements about {region} in 24 h, 0 about Ukraine (demo).',
      delay: 'Data arrive with a 10–60 min delay.',
      tapCycle: 'Tap to switch state (demo)',
      washington: 'Washington', kyiv: 'Kyiv', gap: '{n} h apart',
      globeTitle: 'Where Trump is looking · 24 h',
      globeHint: 'Drag to rotate. Tap a lit region.',
      globeFail: 'The globe did not load. Internet connection needed.',
      lgUkraine: 'Ukraine', lgOther: 'other regions', lgQuiet: 'quiet',
      nStatements: '{n} statements in 24 h (demo)',
      noStatements: 'No statements in 24 h (demo).',
      latest: 'Latest statement',
      openFeed: 'Open in feed', close: 'Close', open: 'Open',
      quotePh: '"Verbatim English quote goes here"',
      transPh: '"Ukrainian translation goes here"',
      summaryPh: 'Our one-line summary (placeholder)',
      sourcePh: 'Source: Example News',
      c1: 'days since the latest statement about Ukraine',
      c2: 'statements about Ukraine in 7 days',
      c3: 'The 24 hours have lasted {N} days', c3base: 'baseline: 5 Nov 2024',
      c3link: 'promises',
      shelter: 'Touch grass',
      shelterSub: 'leave the internet for 24 hours',
      shelterOn: 'You\'re on the grass until {time}. It\'s quiet here.',
      shelterCancel: 'Tap to cancel',
      shelterToast: 'Notifications off for 24 h (demo)',
      gagsTitle: 'Running features',
      twTitle: '"Two weeks"',
      twSub: 'Tracking "two weeks" deadlines about Russia and Ukraine.',
      twLine: 'Deadline from a statement on {date}, {d} days (demo)',
      twPassed: 'The two weeks ended {n} days ago',
      twLeft: '{n} days until the deadline',
      statusLbl: 'Status:',
      pendingConfirm: 'awaiting confirmation',
      tacoTitle: 'TACO-meter',
      tacoSub: 'Threat → what happened next. Ultimatums to Russia.', tacoPending: 'Waiting to see if he chickens out',
      tacoThreat: 'Threat (demo): [description from source], {date}',
      tacoOutcome: 'Outcome:',
      tacoNote: 'Outcomes are shown only after Kondrat confirms them.',
      feedTitle: 'Statements feed',
      searchPh: 'Search: region, topic, source…',
      allRegions: 'All regions', allTopics: 'All topics',
      emptyTitle: 'No statements. Suspicious.',
      emptySub: 'Nothing found. Change the filter.',
      paraphrase: 'Paraphrase',
      paraphraseNote: 'No direct quote, only a paraphrase from the source. Paraphrases never trigger 🟠.',
      retracted: 'Retracted: {reason}',
      victimsNote: 'Topic: victims. Joke framing (levels, badges) is turned off for this entry.',
      back: '← Back',
      fDate: 'Date and time (Kyiv)', fPlatform: 'Platform', fRegion: 'Region', fTopics: 'Topics', fSources: 'Sources',
      mt: 'machine translation',
      original: 'Original (EN)', translation: 'Translation (UA)',
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
      nIos: 'iPhone: notifications work only after Share → "Add to Home Screen". Then open the app from its icon.',
      nPreview: 'This is how a notification will look',
      pushTitle: '🟠 Помаранчева тривога',
      pushBody: 'Трамп знову говорить про Україну', digestTitle: '🟠 Помаранчева тривога: підсумок дня.', digestBody: 'Україна 3, Гренландія 1', pushLangNote: 'Push texts are Ukrainian only for now.',
      nDemo: 'In the mockup, settings are saved only in this browser; real push does not work yet.',
      aTitle: 'About',
      disclaimer: 'Satirical project. Quotes are real, comments are ours.',
      aHow: 'How it works',
      aHow1: 'Every 30 min a script checks news and transcripts. No AI.',
      aHow2: 'We publish only verbatim quotes found in two independent outlets or in a primary source.',
      aHow3: 'Paraphrases are marked "Paraphrase" and never trigger 🟠.',
      aHow4: 'Translation is machine-made (Argos Translate); the English original is always shown.',
      aHow5: 'Wrong entries never disappear silently; they are marked "Retracted: reason".',
      aSources: 'Sources',
      aSourcesT: 'Reuters, AP, BBC, The Guardian, Politico, CNN, Kyiv Independent, Ukrainska Pravda, Suspilne, Ukrinform, whitehouse.gov. The list is still being checked.',
      aReport: 'Report an error',
      aReportT: 'Email {email}: the link to the statement and what is wrong.',
      aSafety: 'This is not an air-raid alert: no sirens and no red. Real alerts come only from official apps.',
      aAff: 'Not affiliated with any state, party, media outlet or politician.',
      aIcon: 'Icon: pick a variant',
      iconA: 'A · alert light', iconB: 'B · orange swirl',
      iconNote: 'Choice is for the mockup only. Tell us which one you like.',
      aCode: 'Open source, MIT licence.',
      draftNote: 'Draft: joke texts are drafts awaiting Kondrat\'s approval.',
      themeLight: 'Light theme', themeDark: 'Dark theme'
    }
  };
  // Error-report contact (Kondrat's choice, DECISIONS.md 2026-10-17).
  const EMAIL = 'kondrat1983@gmail.com';
  function t(key, vars) {
    let s = (T[state.lang] && T[state.lang][key] !== undefined) ? T[state.lang][key] : (T.uk[key] !== undefined ? T.uk[key] : key);
    vars = Object.assign({ email: EMAIL }, vars || {});
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- reference data ----------
  // ISO 3166 numeric ids as used by world-atlas.
  const REGIONS = {
    ukraine:   { ids: ['804'], uk: 'Україна', en: 'Ukraine' },
    russia:    { ids: ['643'], uk: 'Росія', en: 'Russia' },
    greenland: { ids: ['304', '208'], uk: 'Гренландія / Данія', en: 'Greenland / Denmark', short: { uk: 'Гренландія', en: 'Greenland' }, dat: 'Гренландії', acc: 'Гренландію' },
    canada:    { ids: ['124'], uk: 'Канада', en: 'Canada' },
    mexico:    { ids: ['484'], uk: 'Мексика', en: 'Mexico' },
    panama:    { ids: ['591'], uk: 'Панама', en: 'Panama' },
    china:     { ids: ['156'], uk: 'Китай', en: 'China' },
    venezuela: { ids: ['862'], uk: 'Венесуела', en: 'Venezuela' },
    mideast:   { ids: ['376', '275', '364'], uk: 'Близький Схід', en: 'Middle East' },
    eunato:    { ids: ['250', '276', '616', '380', '724', '826', '528', '056', '752', '246', '578', '642', '440', '428', '233', '203', '703', '348', '040', '620', '300', '100', '191', '705', '008', '499', '807'], uk: 'ЄС / НАТО', en: 'EU / NATO' },
    usa:       { ids: ['840'], uk: 'США: внутрішні справи', en: 'US: domestic' }
  };
  const US_STATES = { california: { uk: 'Каліфорнія', en: 'California', dat: 'Каліфорнії', acc: 'Каліфорнію', coord: [-119.4, 37.2] } };
  // Ukrainian grammatical case for the {region} templates ('dat' = дісталося кому, 'acc' = про що).
  function regionCase(key, usState, kase) {
    const r = key === 'usa' && usState ? US_STATES[usState] : REGIONS[key];
    if (state.lang === 'uk' && r[kase]) return r[kase];
    return regionShort(key, usState);
  }
  function regionName(key, usState) {
    if (key === 'usa' && usState) return (state.lang === 'uk' ? 'США: ' : 'US: ') + US_STATES[usState][state.lang];
    return REGIONS[key][state.lang];
  }
  function regionShort(key, usState) {
    if (key === 'usa' && usState) return US_STATES[usState][state.lang];
    const r = REGIONS[key];
    return r.short ? r.short[state.lang] : r[state.lang];
  }
  const TOPICS = {
    peace: { uk: 'перемовини', en: 'peace talks' },
    aid: { uk: 'допомога', en: 'aid' },
    weapons: { uk: 'зброя', en: 'weapons' },
    territory: { uk: 'території', en: 'territory' },
    sanctions: { uk: 'санкції', en: 'sanctions' },
    tariffs: { uk: 'мита', en: 'tariffs' },
    victims: { uk: 'жертви', en: 'victims' },
    other: { uk: 'інше', en: 'other' }
  };
  const PLATFORMS = {
    speech: { uk: 'промова', en: 'speech' },
    truth: { uk: 'Truth Social', en: 'Truth Social' },
    x: { uk: 'X', en: 'X' },
    interview: { uk: 'інтерв’ю', en: 'interview' },
    presser: { uk: 'пресконференція', en: 'press conference' }
  };
  const SRC = n => ({ name: n, url: 'https://example.com/' + n.toLowerCase().replace(/\s+/g, '-') });

  // Placeholder feed. No quotes: the quote field is always the placeholder text.
  const FEED = [
    { id: '1', region: 'ukraine', topics: ['peace'], platform: 'truth', t: '2026-10-17T09:12:00Z', sources: [SRC('Example News'), SRC('Example Wire')] },
    { id: '2', region: 'ukraine', topics: ['aid', 'weapons'], platform: 'presser', t: '2026-10-16T18:40:00Z', paraphrase: true, sources: [SRC('Example News')] },
    { id: '3', region: 'russia', topics: ['sanctions'], platform: 'interview', t: '2026-10-16T14:05:00Z', sources: [SRC('Example Wire'), SRC('Example Times')] },
    { id: '4', region: 'greenland', topics: ['territory'], platform: 'x', t: '2026-10-16T11:30:00Z', sources: [SRC('Example News'), SRC('Example Times')] },
    { id: '5', region: 'usa', usState: 'california', topics: ['other'], platform: 'speech', t: '2026-10-15T22:15:00Z', sources: [SRC('Example Wire'), SRC('Example News')] },
    { id: '6', region: 'ukraine', topics: ['victims'], platform: 'speech', t: '2026-10-15T16:00:00Z', victims: true, sources: [SRC('Example Times'), SRC('Example Wire')] },
    { id: '7', region: 'china', topics: ['tariffs'], platform: 'truth', t: '2026-10-15T08:20:00Z', sources: [SRC('Example News'), SRC('Example Wire')] },
    { id: '8', region: 'ukraine', topics: ['territory'], platform: 'interview', t: '2026-10-14T19:45:00Z',
      retracted: { uk: 'цитату не знайдено в тексті джерела (демо)', en: 'quote not found in the source text (demo)' }, sources: [SRC('Example News')] },
    { id: '9', region: 'mideast', topics: ['other'], platform: 'presser', t: '2026-10-14T15:10:00Z', sources: [SRC('Example Times'), SRC('Example Wire')] },
    { id: '10', region: 'canada', topics: ['tariffs'], platform: 'x', t: '2026-10-13T13:00:00Z', sources: [SRC('Example News'), SRC('Example Times')] }
  ];

  // Demo level states (switcher on Home).
  const BASE_COUNTS = { russia: 1, greenland: 1, mexico: 1, china: 2, mideast: 2, eunato: 1, usa: 3 };
  const LEVELS = {
    green:      { emoji: '🟢', name: 'lvl_green', sub: 'sub_green', cls: 'lv-green', day: 'asleep', since: 3, week: 2, preview: '1' },
    yellow:     { emoji: '🟡', name: 'lvl_yellow', sub: 'sub_yellow', cls: 'lv-yellow', day: 'woke', since: 1, week: 3, preview: '2', ukraine: 'yellow', focus: 'ukraine' },
    orange:     { emoji: '🟠', name: 'lvl_orange', sub: 'sub_orange', cls: 'lv-orange', day: 'mic', since: 0, week: 4, preview: '1', ukraine: 'orange', ukCount: 3, focus: 'ukraine' },
    white:      { emoji: '⚪', name: 'lvl_white', sub: 'sub_white', cls: 'lv-white', day: 'woke', since: 0, week: 4, preview: '1' },
    greenland:  { emoji: '🟢', name: 'lvl_green', sub: 'sub_elsewhere', cls: 'lv-elsewhere', day: 'woke', since: 2, week: 2, preview: '4', elsewhere: 'greenland', counts: { greenland: 6 }, focus: 'greenland' },
    california: { emoji: '🟢', name: 'lvl_green', sub: 'sub_elsewhere', cls: 'lv-elsewhere', day: 'night', since: 2, week: 2, preview: '5', elsewhere: 'usa', usState: 'california', counts: { usa: 7 }, focus: 'california' }
  };
  const DAY = { asleep: '😴', woke: '☀️', mic: '🎤', night: '🌙', busy: '🌍' };
  const DAY_ORDER = ['asleep', 'woke', 'mic', 'night', 'busy'];

  function levelCounts(lv) {
    const L = LEVELS[lv];
    const c = Object.assign({}, BASE_COUNTS, L.counts || {});
    c.ukraine = L.ukCount || 0;
    return c;
  }

  // ---------- time helpers ----------
  const locale = () => (state.lang === 'uk' ? 'uk-UA' : 'en-GB');
  function fmtTime(d, tz) { return new Intl.DateTimeFormat(locale(), { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d); }
  function fmtDateTime(d, tz) { return new Intl.DateTimeFormat(locale(), { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d); }
  function fmtDate(d) { return new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(d); }
  function tzOffsetMin(tz, d) {
    try {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(d).find(x => x.type === 'timeZoneName').value;
      const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(p);
      return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
    } catch (e) { return null; }
  }
  function kyivTodayUTC() {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const g = k => +p.find(x => x.type === k).value;
    return Date.UTC(g('year'), g('month') - 1, g('day'));
  }
  const daysSince = (y, m, d) => Math.round((kyivTodayUTC() - Date.UTC(y, m - 1, d)) / 864e5);

  // ---------- icons ----------
  const ICONS = {
    a: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#13233f"/>' +
       '<g stroke="#f28c28" stroke-width="3" stroke-linecap="round"><path d="M32 8v6"/><path d="M14 16l4 4"/><path d="M50 16l-4 4"/><path d="M8 32h6"/><path d="M50 32h6"/></g>' +
       '<path d="M18 44a14 14 0 0 1 28 0z" fill="#f28c28"/><path d="M25 38a7 7 0 0 1 7-7" stroke="#fde7cf" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
       '<rect x="14" y="44" width="36" height="6" rx="3" fill="#f28c28"/></svg>',
    b: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#13233f"/>' +
       '<path d="M32 32m0 0a3 3 0 0 1 3 3a6 6 0 0 1-6 6a9 9 0 0 1-9-9a12 12 0 0 1 12-12a15 15 0 0 1 15 15a18 18 0 0 1-18 18" fill="none" stroke="#f28c28" stroke-width="4.5" stroke-linecap="round"/>' +
       '<circle cx="32" cy="32" r="2.6" fill="#f28c28"/></svg>'
  };

  // ---------- globe (d3 orthographic on canvas) ----------
  const ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const Globe = (function () {
    let geo = null, loading = null;
    let wrap, canvas, ctx, proj, path, w = 0, raf = 0, ro = null;
    let rot = [-20, -30, 0], dragging = false, lastT = 0, anim = null;
    let counts = {}, opts = {}, colors = {};
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function load() {
      if (geo) return Promise.resolve(geo);
      if (loading) return loading;
      if (!window.d3 || !window.topojson) return Promise.reject(new Error('d3 not loaded'));
      loading = d3.json(ATLAS_URL).then(topo => {
        const all = topojson.feature(topo, topo.objects.countries).features;
        const regions = {};
        Object.keys(REGIONS).forEach(k => {
          const fc = { type: 'FeatureCollection', features: all.filter(f => REGIONS[k].ids.includes(f.id)) };
          // Label anchor: largest feature's centroid (avoids e.g. Greenland+Denmark midpoint at sea).
          let big = fc.features[0], ba = 0;
          fc.features.forEach(f => { const a = d3.geoArea(f); if (a > ba) { ba = a; big = f; } });
          regions[k] = { fc, anchor: k === 'eunato' ? [10, 50] : d3.geoCentroid(big) };
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

    function focusCoord(f) {
      if (!f || !geo) return null;
      if (f === 'california') return US_STATES.california.coord;
      return geo.regions[f] && geo.regions[f].anchor;
    }
    function focusTo(f) {
      const c = focusCoord(f);
      if (!c) return;
      const from = rot.slice(), to = [-c[0], -c[1], 0];
      // shortest way around
      let d = (to[0] - from[0]) % 360; if (d > 180) d -= 360; if (d < -180) d += 360;
      to[0] = from[0] + d;
      if (reduce) { rot = to; return; }
      anim = { t0: performance.now(), dur: 900, i: d3.interpolate(from, to) };
    }

    function visible(c) { return d3.geoDistance(c, [-rot[0], -rot[1]]) < Math.PI / 2 - 0.05; }

    function draw(now) {
      if (!ctx) return;
      const pulse = reduce ? 1 : 0.5 + 0.5 * Math.sin(now / 420);
      proj.rotate(rot);
      ctx.clearRect(0, 0, w, w);
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = colors.ocean; ctx.fill();
      ctx.beginPath(); path(geo.land); ctx.fillStyle = colors.land; ctx.fill();

      Object.keys(geo.regions).forEach(k => {
        if (k === 'ukraine') return;
        const n = counts[k] || 0;
        if (!n) return;
        const hi = opts.elsewhere === k;
        ctx.beginPath(); path(geo.regions[k].fc);
        ctx.fillStyle = colors.calm;
        ctx.globalAlpha = hi ? 0.75 + 0.25 * pulse : 0.55;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Ukraine: pulses orange only in 🟠; otherwise dim with a faint outline.
      const ua = geo.regions.ukraine.fc;
      ctx.beginPath(); path(ua);
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

      // California marker when the US-domestic statement names a state.
      if (opts.usState && visible(US_STATES[opts.usState].coord)) {
        const p = proj(US_STATES[opts.usState].coord);
        ctx.beginPath(); ctx.arc(p[0], p[1], 4 + 3 * pulse, 0, 2 * Math.PI);
        ctx.fillStyle = colors.surface; ctx.fill(); ctx.strokeStyle = colors.calm; ctx.lineWidth = 2; ctx.stroke();
      }

      // count badges
      ctx.font = '600 11px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      Object.keys(geo.regions).forEach(k => {
        const n = counts[k] || 0;
        if (!n) return;
        let c = geo.regions[k].anchor;
        if (k === 'usa' && opts.usState) c = [-98, 39];
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
        rot[0] += dt * 0.004; // ~4°/s
      }
      draw(now);
    }

    function hit(px, py) {
      const p = proj.invert([px, py]);
      if (p && visible(p)) {
        for (const k of Object.keys(geo.regions)) if (d3.geoContains(geo.regions[k].fc, p)) return k;
      }
      // fall back to count badges (helps with small regions like Panama, Israel)
      let best = null, bd = 18;
      Object.keys(geo.regions).forEach(k => {
        if (!(counts[k] || 0)) return;
        let c = geo.regions[k].anchor;
        if (k === 'usa' && opts.usState) c = [-98, 39];
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
      readColors();
      resize();
      if ('ResizeObserver' in window) { ro = new ResizeObserver(resize); ro.observe(wrap); }
      d3.select(canvas).call(d3.drag()
        .clickDistance(6)
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
      focusTo(o.focus);
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

  // ---------- DOM refs ----------
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
    document.title = t('appName') + (state.lang === 'uk' ? ' · макет' : ' · mockup');
    $('#brand').innerHTML = ICONS[state.icon] + '<span>' + esc(t('appName')) + '</span>';
    const lb = $('#langBtn');
    lb.innerHTML = state.lang === 'uk' ? '<b>UA</b> · EN' : 'UA · <b>EN</b>';
    lb.setAttribute('aria-label', state.lang === 'uk' ? 'Switch to English' : 'Перемкнути на українську');
    $('#demoBanner').textContent = t('demoBanner');
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

  const footer = () => '<footer class="disclaimer">' + esc(t('disclaimer')) + '</footer>';

  // ---------- home ----------
  function clocksHTML() {
    const now = new Date();
    const ow = tzOffsetMin('America/New_York', now), ok = tzOffsetMin('Europe/Kyiv', now);
    const gap = ow === null || ok === null ? '' : '<span class="muted">' + esc(t('gap', { n: (ok - ow) / 60 })) + '</span>';
    return '<span>🇺🇸 ' + esc(t('washington')) + ' <b>' + fmtTime(now, 'America/New_York') + '</b></span><span>🇺🇦 ' + esc(t('kyiv')) + ' <b>' + fmtTime(now, 'Europe/Kyiv') + '</b></span>' + gap;
  }
  function itemQuoteLine(it) {
    if (it.retracted) return esc(t('retracted', { reason: it.retracted[state.lang] }));
    return esc(t('quotePh'));
  }

  function renderHome() {
    const L = LEVELS[state.level];
    const counts = levelCounts(state.level);
    const day = state.dayOverride || L.day;
    const busyRegion = L.elsewhere ? L.elsewhere : 'greenland';
    const busyState = L.elsewhere ? L.usState : null;
    const elsewhereDat = L.elsewhere ? regionCase(L.elsewhere, L.usState, 'dat') : null;
    const based = day === 'busy'
      ? t('based_busy', { n: counts[busyRegion] || 0, region: regionCase(busyRegion, busyState, 'acc') })
      : t('based_' + day);
    const pv = FEED.find(x => x.id === L.preview);
    const muted = state.muteUntil > Date.now();

    const demoBtns = [['green', '🟢'], ['yellow', '🟡'], ['orange', '🟠'], ['white', '⚪'], ['greenland', '🌍 ' + regionShort('greenland')], ['california', '🌍 ' + US_STATES.california[state.lang]]]
      .map(([k, l]) => '<button type="button" data-level="' + k + '" aria-pressed="' + (state.level === k) + '">' + esc(l) + '</button>').join('');

    // two-weeks demo: a statement on 20 Sep 2026 with a 14-day deadline
    const twFrom = Date.UTC(2026, 8, 20), twDays = 14;
    const twDeadline = new Date(twFrom + twDays * 864e5);
    const passed = daysSince(twDeadline.getUTCFullYear(), twDeadline.getUTCMonth() + 1, twDeadline.getUTCDate());

    view.innerHTML =
      '<div class="demo-switch" role="group" aria-label="' + esc(t('demoLevel')) + '"><span class="label">' + esc(t('demoLevel')) + '</span>' + demoBtns + '</div>' +

      '<section class="card level-card ' + L.cls + '" aria-live="polite">' +
        '<div class="row"><span class="level-emoji" aria-hidden="true">' + L.emoji + '</span>' +
        '<div><div class="level-name">' + esc(t(L.name)) + '</div><div>' + esc(t(L.name.replace('lvl_', 'tag_'))) + '</div></div></div>' +
        '<div class="level-sub muted">' + esc(t(L.sub, { time: fmtTime(new Date(FEED[0].t), 'Europe/Kyiv') })) + '</div>' +
        (L.elsewhere ? '<div class="safe-line">' + esc(t('safeTpl', { region: elsewhereDat })) + '</div>' : '') +
      '</section>' +

      '<section class="card status-line" id="statusLine" role="button" tabindex="0" aria-label="' + esc(t('tapCycle')) + '">' +
        '<div class="status-main">' + DAY[day] + ' ' + esc(t('day_' + day, { region: regionCase(busyRegion, busyState, 'dat') })) + '</div>' +
        '<div class="clocks" id="clocks">' + clocksHTML() + '</div>' +
        '<div class="based-on">' + esc(based) + ' ' + esc(t('delay')) + '</div>' +
        '<div class="based-on" style="margin-top:4px">↻ ' + esc(t('tapCycle')) + '</div>' +
      '</section>' +

      '<section class="card globe-card"><h2>🌍 ' + esc(t('globeTitle')) + '</h2>' +
        '<div class="globe-wrap" id="globeWrap"><div class="globe-fallback" id="globeFallback">…</div></div>' +
        '<div class="legend"><span><i style="background:var(--orange)"></i>' + esc(t('lgUkraine')) + '</span>' +
        '<span><i style="background:var(--calm)"></i>' + esc(t('lgOther')) + '</span>' +
        '<span><i style="background:var(--land)"></i>' + esc(t('lgQuiet')) + '</span></div>' +
        '<div class="based-on" style="text-align:center;margin-top:4px">' + esc(t('globeHint')) + '</div>' +
      '</section>' +

      '<a class="card item" href="#/s/' + pv.id + '">' +
        '<div class="row between"><h3>' + esc(t('latest')) + '</h3><span class="badge region">' + esc(regionName(pv.region, pv.usState)) + '</span></div>' +
        '<div class="quote">' + itemQuoteLine(pv) + '</div>' +
        '<div class="meta">' + esc(fmtDateTime(new Date(pv.t), 'Europe/Kyiv')) + ' · ' + esc(PLATFORMS[pv.platform][state.lang]) + ' · ' + esc(pv.sources[0].name) + '</div>' +
      '</a>' +

      '<div class="counters">' +
        '<div class="counter"><div class="num">' + L.since + '</div><div class="lbl">' + esc(t('c1')) + '</div></div>' +
        '<div class="counter"><div class="num">' + L.week + '</div><div class="lbl">' + esc(t('c2')) + '</div></div>' +
        '<div class="counter"><div class="num" id="c24">' + daysSince(2024, 11, 5) + '</div><div class="lbl" id="c24lbl">' + esc(t('c3', { N: daysSince(2024, 11, 5) })) + '</div><div class="lbl">' + esc(t('c3base')) + '</div>' +
          '<a href="https://example.com/24-hours-promises" target="_blank" rel="noopener">' + esc(t('c3link')) + ' ↗</a></div>' +
      '</div>' +

      '<button type="button" class="shelter' + (muted ? ' on' : '') + '" id="shelterBtn">' +
        '<span class="ico" aria-hidden="true">' + (muted ? '🌱' : '🌿') + '</span><span>' +
        (muted
          ? '<span class="t">' + esc(t('shelterOn', { time: fmtDateTime(new Date(state.muteUntil), 'Europe/Kyiv') })) + '</span><br><span class="s">' + esc(t('shelterCancel')) + '</span>'
          : '<span class="t">' + esc(t('shelter')) + '</span><br><span class="s">' + esc(t('shelterSub')) + '</span>') +
        '</span></button>' +

      '<div class="section-title">' + esc(t('gagsTitle')) + '</div>' +
      '<section class="card gag"><h3>⏳ ' + esc(t('twTitle')) + '</h3><div class="placeholder small">' + esc(t('twSub')) + '</div>' +
        '<div class="small" style="margin-top:6px">' + esc(t('twLine', { date: fmtDate(new Date(twFrom)), d: twDays })) + '</div>' +
        '<div class="big">' + esc(passed >= 0 ? t('twPassed', { n: passed }) : t('twLeft', { n: -passed })) + '</div>' +
        '<div class="small">' + esc(t('statusLbl')) + ' <span class="pending">' + esc(t('pendingConfirm')) + '</span></div>' +
        '<div class="tiny muted" style="margin-top:4px">' + esc(t('sourcePh')) + ' · <a href="https://example.com/two-weeks" target="_blank" rel="noopener">example.com</a></div>' +
      '</section>' +
      '<section class="card gag"><h3>🌮 ' + esc(t('tacoTitle')) + '</h3><div class="placeholder small">' + esc(t('tacoSub')) + '</div>' +
        '<div class="small" style="margin-top:6px">' + esc(t('tacoThreat', { date: fmtDate(new Date(Date.UTC(2026, 8, 1))) })) + '</div>' +
        '<div class="small" style="margin-top:4px">' + esc(t('tacoOutcome')) + ' <b>' + esc(t('tacoPending')) + '</b> <span class="pending">' + esc(t('pendingConfirm')) + '</span></div>' +
        '<div class="tiny muted" style="margin-top:4px">' + esc(t('tacoNote')) + '</div>' +
      '</section>' +
      footer();

    view.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => {
      state.level = b.getAttribute('data-level'); state.dayOverride = null; renderHome();
    }));
    const sl = $('#statusLine');
    const cycle = () => { const cur = state.dayOverride || L.day; state.dayOverride = DAY_ORDER[(DAY_ORDER.indexOf(cur) + 1) % DAY_ORDER.length]; renderHome(); };
    sl.addEventListener('click', cycle);
    sl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); } });
    $('#shelterBtn').addEventListener('click', () => {
      if (state.muteUntil > Date.now()) state.muteUntil = 0;
      else { state.muteUntil = Date.now() + 24 * 3600e3; toast(t('shelterToast')); }
      store.set('muteUntil', state.muteUntil); renderHome();
    });

    const gw = $('#globeWrap'), fb = $('#globeFallback');
    Globe.load().then(() => {
      if (!document.body.contains(gw)) return;
      fb.remove();
      Globe.mount(gw, {
        counts, ukraine: L.ukraine, elsewhere: L.elsewhere, usState: L.usState, focus: L.focus,
        onTap: k => regionSheet(k, counts, L)
      });
    }).catch(() => { if (fb) fb.textContent = t('globeFail'); });
  }

  function regionSheet(k, counts, L) {
    const n = counts[k] || 0;
    const usState = k === 'usa' ? (L.usState || 'california') : null;
    const it = FEED.find(x => x.region === k && !x.retracted);
    openSheet(
      '<h3>' + esc(regionName(k, usState)) + '</h3>' +
      '<div class="muted small">' + esc(n ? t('nStatements', { n }) : t('noStatements')) + '</div>' +
      (n ? '<div class="card" style="margin-top:10px;box-shadow:none"><div class="small muted">' + esc(t('latest')) + '</div>' +
        '<div class="quote" style="font-weight:600;margin:4px 0">' + esc(t('quotePh')) + '</div>' +
        '<div class="small">' + esc(t('sourcePh')) + ' · <a href="https://example.com/' + k + '" target="_blank" rel="noopener">example.com</a></div></div>' : '') +
      '<div class="row" style="margin-top:10px">' +
        (it && n ? '<a class="btn" href="#/s/' + it.id + '">' + esc(t('open')) + '</a>' : '') +
        '<button type="button" class="btn" id="sheetFeed">' + esc(t('openFeed')) + '</button>' +
        '<button type="button" class="btn" data-close>' + esc(t('close')) + '</button></div>'
    );
    $('#sheetFeed').addEventListener('click', () => { state.feed = { region: k, topic: 'all', q: '' }; closeSheet(); location.hash = '#/feed'; });
  }

  // ---------- feed ----------
  function itemSearchText(it) {
    const parts = [REGIONS[it.region].uk, REGIONS[it.region].en, PLATFORMS[it.platform].uk, PLATFORMS[it.platform].en, T.uk.summaryPh, T.en.summaryPh];
    if (it.usState) parts.push(US_STATES[it.usState].uk, US_STATES[it.usState].en);
    it.topics.forEach(tp => parts.push(TOPICS[tp].uk, TOPICS[tp].en));
    it.sources.forEach(s => parts.push(s.name));
    if (it.paraphrase) parts.push(T.uk.paraphrase, T.en.paraphrase);
    if (it.retracted) parts.push(it.retracted.uk, it.retracted.en);
    return parts.join(' ').toLowerCase();
  }
  function itemCard(it) {
    const badges = [];
    badges.push('<span class="badge region">' + esc(regionName(it.region, it.usState)) + '</span>');
    if (it.region === 'ukraine' && !it.paraphrase && !it.retracted && !it.victims) badges.push('<span class="badge orange">🟠</span>');
    if (it.paraphrase) badges.push('<span class="badge paraphrase">' + esc(t('paraphrase')) + '</span>');
    if (it.retracted) badges.push('<span class="badge retracted">' + esc(t('retracted', { reason: it.retracted[state.lang] })) + '</span>');
    it.topics.forEach(tp => badges.push('<span class="badge">#' + esc(TOPICS[tp][state.lang]) + '</span>'));
    return '<a class="card item' + (it.retracted ? ' retracted' : '') + '" href="#/s/' + it.id + '">' +
      '<div class="meta">' + esc(fmtDateTime(new Date(it.t), 'Europe/Kyiv')) + ' · ' + esc(PLATFORMS[it.platform][state.lang]) + '</div>' +
      '<div class="quote">' + (it.paraphrase ? esc(t('summaryPh')) : esc(t('quotePh'))) + '</div>' +
      '<div class="tags">' + badges.join('') + '</div>' +
      '<div class="meta" style="margin-top:6px">' + esc(it.sources.map(s => s.name).join(', ')) + '</div>' +
    '</a>';
  }
  function renderFeed() {
    const f = state.feed;
    const regionOpts = '<option value="all">' + esc(t('allRegions')) + '</option>' +
      Object.keys(REGIONS).map(k => '<option value="' + k + '"' + (f.region === k ? ' selected' : '') + '>' + esc(REGIONS[k][state.lang]) + '</option>').join('');
    const topicChips = ['all'].concat(Object.keys(TOPICS)).map(k =>
      '<button type="button" class="chip" data-topic="' + k + '" aria-pressed="' + (f.topic === k) + '">' + esc(k === 'all' ? t('allTopics') : '#' + TOPICS[k][state.lang]) + '</button>').join('');
    view.innerHTML =
      '<h1 style="font-size:22px;margin:4px 0 10px">' + esc(t('feedTitle')) + '</h1>' +
      '<input type="search" class="search" id="q" placeholder="' + esc(t('searchPh')) + '" value="' + esc(f.q) + '" aria-label="' + esc(t('searchPh')) + '">' +
      '<div class="row" style="margin-top:8px"><select class="select" id="regionSel" aria-label="' + esc(t('fRegion')) + '">' + regionOpts + '</select></div>' +
      '<div class="chips" role="group" aria-label="' + esc(t('fTopics')) + '">' + topicChips + '</div>' +
      '<div id="list"></div>' + footer();
    const drawList = () => {
      const q = f.q.trim().toLowerCase();
      const items = FEED.filter(it => (f.region === 'all' || it.region === f.region) &&
        (f.topic === 'all' || it.topics.includes(f.topic)) && (!q || itemSearchText(it).includes(q)));
      $('#list').innerHTML = items.length ? items.map(itemCard).join('')
        : '<div class="empty"><div class="placeholder">' + esc(t('emptyTitle')) + '</div><div class="small">' + esc(t('emptySub')) + '</div></div>';
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
    const it = FEED.find(x => x.id === id);
    if (!it) { view.innerHTML = '<a class="back" href="#/feed">' + esc(t('back')) + '</a><div class="empty">' + esc(t('notFound')) + '</div>'; return; }
    let body = '';
    if (it.retracted) {
      body = '<div class="notice">🚫 ' + esc(t('retracted', { reason: it.retracted[state.lang] })) + '</div>';
    } else {
      if (it.victims) body += '<div class="notice">' + esc(t('victimsNote')) + '</div>';
      if (it.paraphrase) {
        body += '<div class="notice"><span class="badge paraphrase">' + esc(t('paraphrase')) + '</span> ' + esc(t('paraphraseNote')) + '</div>' +
          '<div class="card"><div class="small muted">' + esc(t('summaryPh')) + '</div></div>';
      } else {
        body += '<div class="small muted" style="margin-bottom:4px">' + esc(t('original')) + '</div>' +
          '<blockquote class="q" lang="en">' + esc(T.en.quotePh) + '</blockquote>' +
          '<div class="translation"><div class="small muted">' + esc(t('translation')) + ' · <span class="badge">' + esc(t('mt')) + '</span></div>' +
          '<p style="margin:6px 0 0" lang="uk">' + esc(T.uk.transPh) + '</p></div>';
      }
    }
    view.innerHTML =
      '<a class="back" href="#/feed">' + esc(t('back')) + '</a>' +
      '<section class="card">' + body + '</section>' +
      '<section class="card"><dl class="kv">' +
        '<dt>' + esc(t('fDate')) + '</dt><dd>' + esc(fmtDateTime(new Date(it.t), 'Europe/Kyiv')) + '</dd>' +
        '<dt>' + esc(t('fPlatform')) + '</dt><dd>' + esc(PLATFORMS[it.platform][state.lang]) + '</dd>' +
        '<dt>' + esc(t('fRegion')) + '</dt><dd>' + esc(regionName(it.region, it.usState)) + '</dd>' +
        '<dt>' + esc(t('fTopics')) + '</dt><dd>' + it.topics.map(tp => '<span class="badge">#' + esc(TOPICS[tp][state.lang]) + '</span>').join(' ') + '</dd>' +
      '</dl></section>' +
      '<section class="card"><h3>' + esc(t('fSources')) + '</h3><ul class="sources">' +
        it.sources.map(s => '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + ' ↗</a> <span class="tiny muted">example.com</span></li>').join('') +
      '</ul></section>' +
      '<div class="row" style="gap:10px">' +
        '<button type="button" class="btn" id="reportBtn" style="flex:1">⚑ ' + esc(t('report')) + '</button>' +
        '<button type="button" class="btn primary" id="shareBtn" style="flex:1">↗ ' + esc(t('share')) + '</button></div>' +
      footer();
    $('#reportBtn').addEventListener('click', () => openSheet('<h3>' + esc(t('report')) + '</h3><p>' + esc(t('reportText')) + '</p>' +
      '<a class="btn block primary" style="margin-bottom:8px" href="mailto:' + EMAIL + '?subject=' + encodeURIComponent('Orange Alert: error report #' + it.id) + '&body=' + encodeURIComponent(location.href) + '">✉️ ' + esc(EMAIL) + '</a>' +
      '<button type="button" class="btn block" data-close>' + esc(t('close')) + '</button>'));
    $('#shareBtn').addEventListener('click', async () => {
      const url = location.href;
      try {
        if (navigator.share) { await navigator.share({ title: t('appName'), url }); return; }
        await navigator.clipboard.writeText(url); toast(t('copied'));
      } catch (e) { if (!(e && e.name === 'AbortError')) toast(url); }
    });
  }

  // ---------- notification settings ----------
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
      '<div class="push-preview"><span class="app-ico">' + ICONS[state.icon] + '</span><div><div class="ttl">' + esc(t('pushTitle')) + '</div>' +
        '<div class="small" lang="uk">' + esc(t('pushBody')) + '</div></div></div>' +
      '<div class="push-preview" style="margin-top:8px"><span class="app-ico">' + ICONS[state.icon] + '</span><div><div class="ttl" lang="uk">' + esc(t('digestTitle')) + '</div>' +
        '<div class="small" lang="uk">' + esc(t('digestBody')) + '</div></div></div>' +
      (t('pushLangNote') ? '<p class="tiny muted">' + esc(t('pushLangNote')) + '</p>' : '') +
      '<p class="tiny muted">' + esc(t('nDemo')) + '</p>' + footer();
    const bind = (id, key) => $('#' + id).addEventListener('change', e => { n[key] = e.target.checked; store.set('notify', n); syncDisabled(); });
    bind('nOn', 'on'); bind('nDigest', 'digest'); bind('nOrange', 'perOrange'); bind('nTUA', 'tUkraine'); bind('nTRU', 'tRussia');
    $('#qFrom').addEventListener('change', e => { n.qFrom = e.target.value; store.set('notify', n); });
    $('#qTo').addEventListener('change', e => { n.qTo = e.target.value; store.set('notify', n); });
    function syncDisabled() {
      ['nDigest', 'nOrange', 'nTUA', 'nTRU', 'qFrom', 'qTo'].forEach(id => { $('#' + id).disabled = !n.on; });
      ['nTUA', 'nTRU'].forEach(id => { $('#' + id).disabled = !n.on || !n.perOrange; });
    }
    syncDisabled();
  }

  // ---------- about ----------
  function renderAbout() {
    const iconBtn = k => '<button type="button" class="icon-opt" data-icon="' + k + '" aria-pressed="' + (state.icon === k) + '">' + ICONS[k] + '<span class="small">' + esc(t(k === 'a' ? 'iconA' : 'iconB')) + '</span></button>';
    view.innerHTML =
      '<div class="about">' +
      '<h1 style="font-size:22px;margin:4px 0 10px">' + esc(t('aTitle')) + '</h1>' +
      '<section class="card"><p style="margin:0;font-weight:700;font-size:17px">' + esc(t('disclaimer')) + '</p>' +
        '<p class="small muted" style="margin:8px 0 0">' + esc(t('aAff')) + '</p>' +
        '<p class="small muted" style="margin:6px 0 0">' + esc(t('aSafety')) + '</p></section>' +
      '<section class="card"><h3>' + esc(t('aHow')) + '</h3><ul class="small">' +
        ['aHow1', 'aHow2', 'aHow3', 'aHow4', 'aHow5'].map(k => '<li>' + esc(t(k)) + '</li>').join('') + '</ul></section>' +
      '<section class="card"><h3>' + esc(t('aSources')) + '</h3><p class="small" style="margin:0">' + esc(t('aSourcesT')) + '</p></section>' +
      '<section class="card"><h3>' + esc(t('aReport')) + '</h3><p class="small" style="margin:0">✉️ ' + esc(t('aReportT')) + '</p>' +
        '<a class="btn" style="margin-top:8px" href="mailto:' + EMAIL + '?subject=' + encodeURIComponent('Orange Alert: error report') + '">' + esc(EMAIL) + '</a></section>' +
      '<section class="card"><h3>' + esc(t('aIcon')) + '</h3><div class="icons">' + iconBtn('a') + iconBtn('b') + '</div>' +
        '<p class="tiny muted" style="margin:8px 0 0">' + esc(t('iconNote')) + '</p></section>' +
      '<p class="tiny muted" style="text-align:center">' + esc(t('aCode')) + '</p>' +
      '<p class="tiny muted" style="text-align:center"><span class="pending">' + esc(t('draftNote')) + '</span></p>' +
      '</div>' + footer();
    view.querySelectorAll('[data-icon]').forEach(b => b.addEventListener('click', () => {
      state.icon = b.getAttribute('data-icon'); store.set('icon', state.icon); renderChrome(); renderAbout();
    }));
  }

  // ---------- router ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, arg] = h.split('/');
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
    view.scrollTop = 0; window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  // live clocks + 24h counter
  setInterval(() => {
    const c = document.getElementById('clocks');
    if (c) c.innerHTML = clocksHTML();
    const c24 = document.getElementById('c24');
    if (c24) c24.textContent = daysSince(2024, 11, 5);
    const c24l = document.getElementById('c24lbl');
    if (c24l) c24l.textContent = t('c3', { N: daysSince(2024, 11, 5) });
  }, 15000);

  renderChrome();
  route();
})();
