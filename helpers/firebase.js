let axios = require('axios')

exports.createRefLink = async function (fb_id,ps_id) {
  let response = await axios.post('https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=' + process.env.FIREBASE_KEY,
    {
      "dynamicLinkInfo": {
        "domainUriPrefix": "https://ezdefi.page.link",
        "link": `https://ezdefi.web.app?token=asrm&app=ezdefibounty&referralID=${fb_id}&subid=${ps_id}`,
        "androidInfo": {
          "androidPackageName": "com.ezdefi",
          "androidMinPackageVersionCode": "105"
        },
        "iosInfo": {
          "iosBundleId": "com.ezdefi.nexty",
          "iosCustomScheme": "ezdefi://",
          "iosAppStoreId": "1492046549"
        }
      },
      "suffix": {
        "option": "SHORT"
      }
    });
  // console.log(response)
  return response.data.shortLink
}
