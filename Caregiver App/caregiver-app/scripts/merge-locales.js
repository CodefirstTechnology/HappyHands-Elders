const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));
const hi = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/hi.json'), 'utf8'));
const mr = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/mr.json'), 'utf8'));
const hoHi = JSON.parse(
  fs.readFileSync(path.join(root, '../../Family App/family-app/src/locales/hi.json'), 'utf8'),
);
const hoMr = JSON.parse(
  fs.readFileSync(path.join(root, '../../Family App/family-app/src/locales/mr.json'), 'utf8'),
);

function fillMissing(target, source, alt) {
  for (const ns of Object.keys(source)) {
    if (!target[ns]) target[ns] = {};
    for (const k of Object.keys(source[ns])) {
      if (!(k in target[ns])) {
        target[ns][k] = alt?.[ns]?.[k] ?? source[ns][k];
      }
    }
  }
}

fillMissing(hi, en, hoHi);
fillMissing(mr, en, hoMr);

const shHi = {
  namaste: 'नमस्ते, {{name}}',
  online: 'ऑनलाइन',
  newNotifications: '{{count}} नई सूचना — देखने के लिए टैप करें',
  todayEarningsLabel: 'आज की कमाई',
  jobsLabel: 'नौकरियाँ',
  jobsCompletedToday: 'आज {{count}} नौकरी पूर्ण',
  hoursLoggedToday: 'आज {{hours}} घंटे लॉग',
  earningsUpdateHint: 'स्लॉट समाप्त या क्लॉक आउट पर कमाई अपडेट',
  monthCardLabel: 'इस माह · {{month}}',
  monthJobsSub: 'इस माह {{count}} नौकरी पूर्ण',
  monthEmptySub: 'पूर्ण विज़िट मासिक कुल में गिनी जाती हैं',
  workInProgress: 'काम जारी',
  tapJobDetails: 'नौकरी विवरण के लिए टैप',
  endWorkClockOut: 'काम समाप्त और क्लॉक आउट',
  sharingLocation: 'ग्राहक के साथ लाइव स्थान साझा',
  openRequestsTitle: 'आपके सेवा क्षेत्र में खुले अनुरोध',
  openRequestsSub: 'केवल आपके ज़ोन के पास ग्राहक — बाहर के सहायक नहीं देख सकते।',
  generalHelp: 'सामान्य मदद',
  accepting: 'स्वीकार हो रहा…',
  acceptJobFirstWins: 'नौकरी स्वीकारें (पहला जीतता है)',
  pleaseWait: 'कृपया प्रतीक्षा…',
  decline: 'अस्वीकार',
  newRequestsSection: 'नए अनुरोध — स्वीकार या अस्वीकार',
  todayJobsSection: 'आज की नौकरियाँ',
  noConfirmedJobs: 'कोई पुष्टि नौकरी नहीं — ऑनलाइन रहें',
  addressOnFile: 'फ़ाइल पर पता',
  locationShared: 'ग्राहक के साथ स्थान साझा',
  tapDirections: 'नेविगेट के लिए दिशा टैप',
  stopSharingLocation: 'स्थान साझा बंद',
  onMyWayShare: 'मैं रास्ते में — स्थान साझा',
  clockedInAtHome: 'आप इस घर पर क्लॉक इन हैं',
  skillLabel: 'कौशल: {{skill}}',
  dateLabel: 'तारीख: {{date}}',
  timeLabel: 'समय: {{start}}{{end}}',
  timeEnd: ' – {{end}}',
  hoursPerDay: '{{hours}} घंटे/दिन',
  workingDays: 'दिन: {{days}}',
  notesLabel: 'नोट्स: {{notes}}',
  tapDirectionsNavigate: 'घर तक नेविगेट के लिए दिशा टैप',
  clockedInSharing: 'क्लॉक इन — स्थान ग्राहक के साथ साझा',
  rejectUnavailable: 'इस समय उपलब्ध नहीं',
};

const shMr = {
  namaste: 'नमस्कार, {{name}}',
  online: 'ऑनलाइन',
  newNotifications: '{{count}} नवीन सूचना — पाहण्यासाठी टॅप',
  todayEarningsLabel: 'आजची कमाई',
  jobsLabel: 'नोकऱ्या',
  jobsCompletedToday: 'आज {{count}} नोकरी पूर्ण',
  hoursLoggedToday: 'आज {{hours}} तास लॉग',
  earningsUpdateHint: 'स्लॉट संपल्यावर किंवा क्लॉक आउटवर कमाई अपडेट',
  monthCardLabel: 'या महिन्यात · {{month}}',
  monthJobsSub: 'या महिन्यात {{count}} नोकरी पूर्ण',
  monthEmptySub: 'पूर्ण भेटी मासिक एकूणात मोजतात',
  workInProgress: 'काम सुरू',
  tapJobDetails: 'नोकरी तपशीलासाठी टॅप',
  endWorkClockOut: 'काम संपवा आणि क्लॉक आउट',
  sharingLocation: 'ग्राहकासोबत लाइव्ह स्थान शेअर',
  openRequestsTitle: 'तुमच्या सेवा क्षेत्रात उघड्या विनंत्या',
  openRequestsSub: 'फक्त तुमच्या झोनजवळ ग्राहक — बाहेरचे सहाय्यक पाहू शकत नाहीत.',
  generalHelp: 'सामान्य मदत',
  accepting: 'स्वीकार होत आहे…',
  acceptJobFirstWins: 'नोकरी स्वीकारा (पहिला जिंकतो)',
  pleaseWait: 'कृपया वाट पहा…',
  decline: 'नाकारा',
  newRequestsSection: 'नवीन विनंत्या — स्वीकार किंवा नाकारा',
  todayJobsSection: 'आजच्या नोकऱ्या',
  noConfirmedJobs: 'पुष्टी नोकऱ्या नाहीत — ऑनलाइन राहा',
  addressOnFile: 'फाइलवर पत्ता',
  locationShared: 'ग्राहकासोबत स्थान शेअर',
  tapDirections: 'नेव्हिगेटसाठी दिशा टॅप',
  stopSharingLocation: 'स्थान शेअर थांबवा',
  onMyWayShare: 'मी मार्गावर — स्थान शेअर',
  clockedInAtHome: 'तुम्ही या घरी क्लॉक इन आहात',
  skillLabel: 'कौशल्य: {{skill}}',
  dateLabel: 'तारीख: {{date}}',
  timeLabel: 'वेळ: {{start}}{{end}}',
  timeEnd: ' – {{end}}',
  hoursPerDay: '{{hours}} तास/दिवस',
  workingDays: 'दिवस: {{days}}',
  notesLabel: 'नोट्स: {{notes}}',
  tapDirectionsNavigate: 'घराकडे नेव्हिगेट करण्यासाठी दिशा टॅप',
  clockedInSharing: 'क्लॉक इन — स्थान ग्राहकासोबत शेअर',
  rejectUnavailable: 'या वेळी उपलब्ध नाही',
};

if (!hi.servantHome) hi.servantHome = {};
if (!mr.servantHome) mr.servantHome = {};
Object.assign(hi.servantHome, shHi);
Object.assign(mr.servantHome, shMr);

const zHi = {
  deleteZoneTitle: 'ज़ोन हटाएं',
  removeZone: '"{{name}}" हटाएं?',
  editZone: 'ज़ोन संपादित',
  newZone: 'नया ज़ोन',
  zoneName: 'ज़ोन का नाम',
  zoneNamePlaceholder: 'जैसे बांद्रा पश्चिम',
  zoneOnMap: 'मैप पर ज़ोन',
  cityLabel: 'शहर',
  cityPlaceholder: 'मुंबई',
  description: 'विवरण',
  descriptionPlaceholder: 'वैकल्पिक विवरण',
  zoneRequired: 'ज़ोन आवश्यक',
  zoneRequiredSub: 'ज़ोन नाम जोड़ें या मैप पर स्थान चुनें।',
  noZonesList: 'अभी कोई ज़ोन नहीं। पहला सेवा क्षेत्र जोड़ें।',
  couldNotSaveZone: 'ज़ोन सेव नहीं हो सका',
};
const zMr = {
  deleteZoneTitle: 'झोन हटवा',
  removeZone: '"{{name}}" काढायचे?',
  editZone: 'झोन संपादा',
  newZone: 'नवीन झोन',
  zoneName: 'झोन नाव',
  zoneNamePlaceholder: 'उदा. बांद्रा पश्चिम',
  zoneOnMap: 'नकाशावर झोन',
  cityLabel: 'शहर',
  cityPlaceholder: 'मुंबई',
  description: 'वर्णन',
  descriptionPlaceholder: 'ऐच्छिक तपशील',
  zoneRequired: 'झोन आवश्यक',
  zoneRequiredSub: 'झोन नाव जोडा किंवा नकाशावर स्थान निवडा.',
  noZonesList: 'अद्याप झोन नाहीत. पहिले सेवा क्षेत्र जोडा.',
  couldNotSaveZone: 'झोन सेव्ह होऊ शकले नाही',
};
Object.assign(hi.zones || {}, zHi);
Object.assign(mr.zones || {}, zMr);
Object.assign(hi.zones || {}, {
  screenTitle: 'सेवा क्षेत्र',
  screenSub: 'जहाँ आप काम के लिए उपलब्ध हैं वे इलाके जोड़ें। घर मालिक ज़ोन से आपको खोज सकते हैं।',
});
Object.assign(mr.zones || {}, {
  screenTitle: 'सेवा क्षेत्रे',
  screenSub: 'जेथे तुम्ही कामासाठी उपलब्ध आहात ते परिसर जोडा. घर मालक झोनद्वारे तुम्हाला शोधू शकतात.',
});

const bHi = {
  directionsToHome: 'घर की दिशा',
  openInGoogleMaps: 'Google Maps में खोलें',
  customerHome: 'ग्राहक का घर',
  helperMarker: 'आप',
};
const bMr = {
  directionsToHome: 'घराकडे दिशा',
  openInGoogleMaps: 'Google Maps मध्ये उघडा',
  customerHome: 'ग्राहकाचे घर',
  helperMarker: 'तुम्ही',
};
Object.assign(hi.bookings || {}, bHi);
Object.assign(mr.bookings || {}, bMr);

const eHi = {
  oneJobInMonth: '{{month}} में 1 पूर्ण नौकरी',
  jobsInMonth: '{{month}} में {{count}} पूर्ण नौकरियाँ',
  monthVisitsHint: 'इस कैलेंडर माह की पूर्ण विज़िट',
  oneJobToday: 'आज 1 पूर्ण नौकरी',
  jobsTodayCount: 'आज {{count}} पूर्ण नौकरियाँ',
  hoursRateHint: '{{hours}} घंटे × {{rate}}/घंटा',
  updatesHint: 'क्लॉक आउट या स्लॉट समाप्त पर अपडेट',
  noMonthJobs: 'इस माह अभी कोई पूर्ण नौकरी नहीं',
  todaySection: 'आज की पूर्ण नौकरियाँ',
  noTodayJobs: 'कमाई देखने के लिए विज़िट पूर्ण करें',
  completedToday: 'आज पूर्ण',
};
const eMr = {
  oneJobInMonth: '{{month}} मध्ये 1 पूर्ण नोकरी',
  jobsInMonth: '{{month}} मध्ये {{count}} पूर्ण नोकऱ्या',
  monthVisitsHint: 'या कॅलेंडर महिन्यातील पूर्ण भेटी',
  oneJobToday: 'आज 1 पूर्ण नोकरी',
  jobsTodayCount: 'आज {{count}} पूर्ण नोकऱ्या',
  hoursRateHint: '{{hours}} तास × {{rate}}/तास',
  updatesHint: 'क्लॉक आउट किंवा स्लॉट संपल्यावर अपडेट',
  noMonthJobs: 'या महिन्यात अद्याप पूर्ण नोकरी नाही',
  todaySection: 'आजच्या पूर्ण नोकऱ्या',
  noTodayJobs: 'कमाई पाहण्यासाठी भेट पूर्ण करा',
  completedToday: 'आज पूर्ण',
};
Object.assign(hi.earnings || {}, eHi);
Object.assign(mr.earnings || {}, eMr);

Object.assign(hi.time || {}, { historyTitle: 'समय इतिहास' });
Object.assign(mr.time || {}, { historyTitle: 'वेळ इतिहास' });
Object.assign(hi.servantHome || {}, { rejectReason: 'इस समय उपलब्ध नहीं' });
Object.assign(mr.servantHome || {}, { rejectReason: 'या वेळी उपलब्ध नाही' });

fs.writeFileSync(path.join(root, 'src/locales/hi.json'), `${JSON.stringify(hi, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'src/locales/mr.json'), `${JSON.stringify(mr, null, 2)}\n`);
console.log('merged hi/mr locales');
