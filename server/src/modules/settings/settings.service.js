const settingsRepository = require('./settings.repository');

const DEFAULT_FALLBACK_FOOTER = `--------------------------
☎️ ទូរស័ព្ទទំនាក់ទំនង (Smart)៖ 070 65 49 59
📲 កុម្មង់តាម Telegram ៖ t.me/Cholykkmart
⭐️ Telegram Group: https://t.me/+msepgFerxEoxNjk1
--------------------------
🛒 Chhorlyka Mart ទាំង ២ សាខា៖
🔹 សាខាផ្លូវជាតិលេខ ៣៖ បុរីពិភពថ្មី គម្រោងទី១ ផ្លូវជាតិលេខ៣ (ផ្លូវលេខ២ ផ្ទះលេខ ៣/៥/៧/៩)
📌 https://maps.app.goo.gl/HTZGiLr6ab3D2PM6A
🔹 សាខាផ្លូវជាតិលេខ ៤ (អូរឌឹម)
📌 https://maps.app.goo.gl/tSiC2pGc1wgkVT2B9`;

const getContactFooter = async () => {
  const setting = await settingsRepository.getSetting('default_contact_footer');
  if (!setting) {
    return {
      key: 'default_contact_footer',
      value: DEFAULT_FALLBACK_FOOTER,
    };
  }
  return setting;
};

const updateContactFooter = async (footerText) => {
  if (typeof footerText !== 'string') {
    throw new Error('Footer text must be a string');
  }
  return await settingsRepository.setSetting('default_contact_footer', footerText);
};

const DEFAULT_SAVED_HASHTAGS = [
  '#ChhorlykaMart',
  '#Promotion',
  '#FreeDelivery',
  '#FlashSale',
  '#CambodiaShop',
  '#គុណភាពល្អ',
];

const getSavedHashtags = async () => {
  const setting = await settingsRepository.getSetting('saved_hashtags');
  if (!setting) {
    return {
      key: 'saved_hashtags',
      value: JSON.stringify(DEFAULT_SAVED_HASHTAGS),
    };
  }
  return setting;
};

const updateSavedHashtags = async (hashtagsArray) => {
  const value = Array.isArray(hashtagsArray) ? JSON.stringify(hashtagsArray) : String(hashtagsArray);
  return await settingsRepository.setSetting('saved_hashtags', value);
};

module.exports = {
  getContactFooter,
  updateContactFooter,
  getSavedHashtags,
  updateSavedHashtags,
};
