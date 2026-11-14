/* =====================================================================
   Survive the Sol – ALL SCREEN TEXT (translations)
   To change any word in the game, change it here.
   {name} style parts are filled in by the game.
   ===================================================================== */
(function (root) {
  'use strict';

  var STRINGS = {
    en: {
      langButton: 'اردو',
      title: 'Survive the Sol',
      tagline: 'Junior Astronaut Mission Trainer',
      intro: 'You are the commander of a small base on the Moon and Mars. Keep your crew safe for 12 days!',
      nameLabel: 'Your name, Commander:',
      namePlaceholder: 'Type your name',
      chooseMission: 'Choose your mission',
      lvl_tutorial: 'Training (Sol 0)', lvl_tutorial_d: 'Learn how to play in 1 day.',
      lvl_moon: 'Moon Base', lvl_moon_d: 'Easy. Watch out for the long lunar night!',
      lvl_mars: 'Mars Base', lvl_mars_d: 'Hard. Dust storms and big solar storms!',
      loading: 'Loading NASA data…',
      loadError: 'Could not load the game data. Please run the game from a web server (see README): python -m http.server',

      // bars + tooltips
      bar_power: 'Power', bar_life: 'Life Support', bar_rad: 'Radiation Safety',
      tip_power: 'Electricity for lights, heaters and machines. Solar panels make it. No power = no base!',
      tip_life: 'Air to breathe, water to drink and food to eat.',
      tip_rad: 'How well your crew is protected from space radiation. Radiation is invisible energy from the Sun and stars that can hurt the body.',
      tip_sol: 'A "sol" is one day on Mars (24 hours 39 minutes). In this game, every turn is one day.',
      tip_dose: 'Radiation dose = how much radiation your body soaks up. Astronauts wear badges (dosimeters) to measure it.',
      tip_flare: 'A solar flare is a giant burst of energy from the Sun. Big ones can send dangerous radiation into space.',
      tip_score: 'Science points: what your crew learned for people on Earth.',
      whatIs: 'What is this?',
      doseWord: 'dose',

      sol: 'Sol {n} of {total}',
      sol0: 'Sol 0 (training)',
      score: 'Science',
      pickCards: 'Pick {n} action(s) for today',
      picksDone: 'All actions done. End the day!',
      endDay: 'End the day 🌙',
      science: 'Science fact',
      tooLow: 'Not enough {bar}!',
      alreadyPlayed: 'Done today ✔',
      noPicks: 'No actions left',
      halfSolar: 'Half power from the sun today!',

      // banners
      banner_night: '🌑 Lunar night: no sunlight, so solar panels make less power. Power drops faster.',
      banner_dust: '🌪️ Dust storm: dust blocks the sun. Solar power is weak and power drops faster.',
      banner_delay: '📡 Mars is far away. Earth replies in about 20 minutes, so you must decide yourself!',
      banner_tutorial: '🎓 Training day! Read the tips and pick 2 cards.',

      // end-of-day pop-up
      dayReport: 'End of Sol {n}',
      dailyNeeds: 'Daily needs of your crew',
      night: 'lunar night', dust: 'dust storm',
      ev_quiet_t: '😌 A quiet night', ev_quiet: 'Nothing bad happened. The crew feels a bit happier.',
      ev_flare_t: '☀️💥 {label}',
      ev_flare: 'A real solar flare (class {cls}) happened on {date}. Radiation Safety −{hit}.',
      ev_flare_this_year: 'This storm really happened this year!',
      ev_flare_sheltered: 'Your storm shelter cut the hit in half! 🛡️',
      ev_dust_t: '🌪️ Dust storm!', ev_dust: 'Red dust covers the sky. Power −{hit}. Solar power will be weak for 2 days.',
      ev_failure_t: '🔧 Something broke!',
      ev_failure_power: 'A battery broke. Power −{hit}.',
      ev_failure_life: 'The water pump broke. Life Support −{hit}.',
      ev_failure_rad: 'A crack in the shield wall! Radiation Safety −{hit}.',
      source: 'Source: {src} · archived NASA data',
      openSource: 'See the NASA record',
      next: 'Next day ➜', seeResult: 'See result ➜', ok: 'OK',

      // win / lose
      win_t: '🎉 Mission complete!',
      win: 'You kept the crew safe for {n} days. Well done, Commander {name}!',
      lose_t: '💔 Mission failed on Sol {n}',
      fail_rad_flare: 'Your radiation shield was too weak when a {label} (class {cls}) hit on {date}.',
      fail_rad_daily: 'Space radiation slowly built up and your shield was too weak.',
      fail_rad_failure: 'A crack in the shield wall let radiation in when your shield was already weak.',
      fail_power_night: 'Your batteries ran out during the long, dark lunar night.',
      fail_power_dust: 'A dust storm covered the solar panels and the power ran out.',
      fail_power_daily: 'The base used more power than it made.',
      fail_power_failure: 'A battery broke when power was already very low.',
      fail_life_daily: 'The crew ran out of air, water and food.',
      fail_life_failure: 'The water pump broke when Life Support was already very low.',
      tip_fail_power: 'Tip: fix the solar panels or start the nuclear generator BEFORE the night or a dust storm.',
      tip_fail_life: 'Tip: grow vegetables, recycle water and make oxygen to keep Life Support up.',
      tip_fail_rad: 'Tip: when ROVI warns about a solar storm, get the storm shelter ready!',
      playAgain: 'Play again', backToMenu: 'Choose mission',
      tutorialDone_t: '🎓 Training complete!',
      tutorialDone: 'Great job! You know the basics. Now try the Moon base.',
      startMoon: 'Go to the Moon 🌙',

      // tutorial (ROVI guides the player)
      tut_1: 'Hi! I am ROVI, your robot helper. Today is Sol 0, a training day. Let me show you around!',
      tut_2: '⚡ This is Power: electricity for lights, heaters and machines. Solar panels make it.',
      tut_3: '💚 This is Life Support: air to breathe, water to drink and food to eat.',
      tut_4: '🛡️ This is Radiation Safety: how well your crew is protected from space radiation.',
      tut_5: 'Watch out! If ANY bar reaches 0, the mission fails. Keep all three bars up.',
      tut_6: 'These are action cards. Green numbers go UP, red numbers go DOWN. Every choice has a cost!',
      tut_7: 'Tap a "?" button to learn a new word. Now pick 2 cards. Tip: the shield wall helps with radiation!',
      tut_8: 'Great choices! Now press "End the day". Something may happen tonight…',
      tutNext: 'Next ➜',
      // Mars: messages from Earth arrive late
      earth_msg: '📡 Message from Earth (sent about 20 minutes ago, so it is old news!): "Yesterday your Power was {power}, Life Support {life}, Radiation Safety {rad}. Good luck, Commander!"',
      earth_first: '📡 Message from Earth: "Welcome to Mars! Our messages take about 20 minutes to reach you. You must make your own choices."',

      // ROVI tips and warnings
      rovi_flare: '⚠️ Beep! My sensors see the Sun getting very busy. A solar storm may hit tonight! Get the storm shelter ready or build shields.',
      rovi_dust: '🌪️ Beep! A dust storm is coming tonight. Solar panels will be weak. Get power now!',
      rovi_failure: '🔧 Beep! Some machines sound strange today. Keep your bars high, just in case.',
      rovi_night_soon: '🌑 The long lunar night starts tomorrow. There will be no sunlight for days. Save up power!',
      rovi_night: '🌑 It is the lunar night. Solar cards give only half power. Nuclear power works day and night!',
      rovi_low_power: '⚡ Power is low! Fix the solar panels or start the nuclear generator.',
      rovi_low_life: '💚 Life Support is low! Grow food, recycle water or make oxygen.',
      rovi_low_rad: '🛡️ Radiation Safety is low! Build a shield wall or a water wall.',
      rovi_tired: '😴 The crew is tired and works slower. Let them rest or call home.',
      rovi_plant: '🌱 Our plant is wilting! Grow vegetables or recycle water to save it.',
      rovi_ok_1: '😊 All looks good, Commander! Remember: every card has a cost.',
      rovi_ok_2: '🔭 Tip: read the science fact at the bottom of each card. They are real!',
      rovi_ok_3: '🔬 Science cards give points for your final rank. Do some when your bars are safe!',
      // crew + plant
      crew: 'Crew',
      crew_ayesha: 'Captain Ayesha', crew_bilal: 'Engineer Bilal', crew_zara: 'Dr. Zara',
      mood_happy: 'happy', mood_ok: 'okay', mood_sad: 'tired',
      tiredNote: 'Tired crew: card gains are smaller!',
      plant: 'Space lettuce',
      tip_plant: 'Your base has a lettuce plant. It grows with water and power, and wilts if you forget it. NASA really grows lettuce on the ISS in a plant chamber called Veggie!',
      tip_morale: 'Morale = how happy the crew feels. Tired, sad crews work slower. Rest, exercise and calls home help.',
      plant_great: 'growing well', plant_ok: 'okay', plant_weak: 'thirsty', plant_dead: 'wilted',

      // newspaper end screen
      paper_name: 'THE SOL TIMES',
      paper_tag: 'News from the Junior Astronaut Trainer',
      paper_hl_win: 'COMMANDER {name} KEEPS {place} CREW SAFE FOR {n} DAYS!',
      paper_hl_lose: '{name}’S {place} BASE HOLDS ON FOR {n} DAYS',
      place_moon: 'MOON', place_mars: 'MARS',
      paper_rank: 'Rank: {rank}',
      rank_cadet: 'Cadet', rank_pilot: 'Pilot', rank_commander: 'Commander',
      rank_info: 'Ranks: Cadet (keep trying!), Pilot (survive 12 days), Commander (survive, 35+ science points and a living plant).',
      paper_days: 'Days survived', paper_science: 'Science points', paper_storms: 'Solar storms', paper_plant: 'Space lettuce',
      paper_biggest: 'Biggest storm: a class {cls} solar flare from {date} – real NASA data!',
      paper_nostorm: 'No solar storms hit the base. Lucky crew!',
      paper_crew: 'Crew: Captain Ayesha, Engineer Bilal and Dr. Zara',
      paper_footer: 'Data: NASA CCMC DONKI, NASA OSDR RadLab, NASA OSDR (archived NASA data)',
      download: 'Download newspaper 📥',
      debrief_title: '🧑‍🚀 What would a real astronaut do?',
      db_shelter_good: '✅ You used the storm shelter in a solar storm. Real astronauts do this too: when NASA’s space weather team warns them, they move to the most shielded part of the spacecraft.',
      db_shelter_tip: '💡 A solar storm hit while the crew was not in a shelter. Real astronauts move to the most shielded spot when NASA warns them about a storm.',
      db_shield_good: '✅ You built radiation shields. NASA studies using water, supplies and Moon or Mars soil to block radiation.',
      db_shield_tip: '💡 You did not build shields. Real mission planners use water, supplies and soil to block radiation.',
      db_food_good: '✅ You grew fresh food. Astronauts really grow lettuce, tomatoes and more on the ISS in Veggie.',
      db_food_tip: '💡 Real astronauts grow fresh vegetables, like the lettuce in NASA’s Veggie chamber. Fresh food helps the body and the mood.',
      db_night_good: '✅ You used nuclear power. A lunar night lasts about 14 Earth days, so NASA is working on small reactors (Fission Surface Power) for Moon bases.',
      db_night_tip: '💡 A lunar night lasts about 14 Earth days with no sunlight. NASA is working on small nuclear reactors (Fission Surface Power) so bases keep their power.',
      db_delay_note: '✅ On Mars you made your own choices. Messages take up to about 20 minutes each way, so real Mars crews must solve problems without waiting for Earth.',
      db_rest_good: '✅ You let the crew rest or exercise. ISS astronauts have planned sleep time and exercise about 2 hours every day.',

      // NASA data notes
      rad_note_moon: '📊 Real NASA data (RadLab): radiation near the Moon is about {x} times stronger than on the Space Station, so Radiation Safety drops faster here.',
      rad_note_mars: '📊 Real NASA data (RadLab): radiation on the Mars surface is about {x} times stronger than on the Space Station, so Radiation Safety drops faster here.',
      rad_source: 'Source: NASA OSDR RadLab, archived NASA data',
      archived: 'archived NASA data',
      dyk_title: '💡 Did you know?',
      dyk_rad_moon: 'NASA detectors measured the radiation near the Moon (LRO spacecraft) and on the Space Station. The Moon had about {x} times more!',
      dyk_rad_mars: 'NASA’s Curiosity rover measures radiation on Mars. It is about {x} times more than inside the Space Station.',
      dyk_rad_deep: 'Far out in deep space, NASA’s BioSentinel measured about {x} times more radiation than the Space Station. Earth’s magnetic field helps protect the Station.',
      mars_credit: 'Mars background: NASA Mars Trek – Viking color mosaic (NASA/JPL-Caltech, USGS).',
      footer_more: 'Radiation: NASA OSDR RadLab. Science facts: NASA OSDR studies. All data is an archived snapshot.',
      footer: 'Solar flares: NASA CCMC DONKI (archived NASA data, not live). Made by TechNest Thinkers for NASA Space Apps 2026.',
      runLocal: 'Tip for teachers: open this game through a web server (python -m http.server).'
    }
  };

  var I18N = {
    lang: 'en',
    strings: STRINGS,
    // t('sol', {n: 3, total: 12}) → "Sol 3 of 12"
    t: function (key, params) {
      var table = STRINGS[I18N.lang] || STRINGS.en;
      var s = table[key];
      if (s === undefined) s = STRINGS.en[key];
      if (s === undefined) return key;
      if (params) s = s.replace(/\{(\w+)\}/g, function (m, p) { return params[p] !== undefined ? params[p] : m; });
      return s;
    },
    // Text from cards.json / facts.json: uses "title_ur" when Urdu is on.
    field: function (obj, name) {
      if (I18N.lang !== 'en' && obj[name + '_' + I18N.lang]) return obj[name + '_' + I18N.lang];
      return obj[name];
    },
    setLang: function (lang) {
      I18N.lang = STRINGS[lang] ? lang : 'en';
      document.documentElement.lang = I18N.lang;
      document.documentElement.dir = I18N.lang === 'ur' ? 'rtl' : 'ltr';
      try { localStorage.setItem('sts-lang', I18N.lang); } catch (e) { /* private mode */ }
    }
  };
  root.I18N = I18N;
})(window);
