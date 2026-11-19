/**
 * iCloud'u yalnızca anahtar-değer deposuyla (KVS) sınırlar.
 *
 * @nauverse/expo-cloud-settings eklentisi KVS kimliğinin yanına boş bir CloudKit
 * tanımı da ekler (`icloud-services: [CloudKit]`, `icloud-container-identifiers: []`).
 * Kapsayıcı olmadığı için App Store imzasında `icloud-container-environment`
 * boş kalır ve yükleme "Invalid Code Signing Entitlements (409)" ile reddedilir.
 * Oyun CloudKit kullanmaz; bu iki anahtar burada silinir.
 *
 * app.json'da iki kez yer alır (cloud-settings eklentisinin önünde ve arkasında):
 * mod sırası nasıl olursa olsun silme en son çalışsın diye.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withKvsOnlyICloud(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['com.apple.developer.icloud-services'];
    delete mod.modResults['com.apple.developer.icloud-container-identifiers'];
    delete mod.modResults['com.apple.developer.icloud-container-environment'];
    return mod;
  });
};
