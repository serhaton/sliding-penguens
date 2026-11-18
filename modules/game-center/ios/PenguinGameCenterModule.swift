import ExpoModulesCore
import GameKit

/// Game Center köprüsü: giriş, liderlik tablosuna skor, başarım bildirme ve
/// Game Center ekranını açma. Coin ya da ilerleme burada saklanmaz; onlar
/// iCloud'dadır. Bütün çağrılar oyuncu giriş yapmamışsa sessizce `false` döner.
///
/// İleride (1.1) online düello için sıra tabanlı maçlar da bu modüle eklenecek.
public class PenguinGameCenterModule: Module {
  private let dashboardDelegate = DashboardDelegate()

  public func definition() -> ModuleDefinition {
    Name("PenguinGameCenter")

    Function("isAuthenticated") { () -> Bool in
      GKLocalPlayer.local.isAuthenticated
    }

    // Giriş. Oyuncu cihazda Game Center'a girmişse sessizce tamamlanır;
    // girmemişse sistemin giriş penceresi açılır. Sonuç bir kez bildirilir.
    AsyncFunction("authenticate") { (promise: Promise) in
      var settled = false
      let finish = {
        guard !settled else { return }
        settled = true
        let player = GKLocalPlayer.local
        var result: [String: Any] = ["authenticated": player.isAuthenticated]
        if player.isAuthenticated {
          result["alias"] = player.alias
        }
        promise.resolve(result)
      }
      GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, _ in
        if let viewController {
          guard let presenter = self?.appContext?.utilities?.currentViewController() else {
            finish()
            return
          }
          // Giriş penceresi kapanınca sistem bu bloğu yeniden çağırır.
          presenter.present(viewController, animated: true)
          return
        }
        finish()
      }
    }.runOnQueue(.main)

    AsyncFunction("submitScore") { (leaderboardId: String, score: Int, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(false)
        return
      }
      GKLeaderboard.submitScore(
        score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]
      ) { error in
        promise.resolve(error == nil)
      }
    }

    // Başarım: `percent` 0–100. Tamamlanınca sistemin başarım bandı görünür.
    AsyncFunction("reportAchievement") { (achievementId: String, percent: Double, promise: Promise) in
      guard GKLocalPlayer.local.isAuthenticated else {
        promise.resolve(false)
        return
      }
      let achievement = GKAchievement(identifier: achievementId)
      achievement.percentComplete = percent
      achievement.showsCompletionBanner = true
      GKAchievement.report([achievement]) { error in
        promise.resolve(error == nil)
      }
    }

    // Game Center ekranı: 'leaderboards' | 'achievements' | 'leaderboard' (tek tablo).
    AsyncFunction("show") { (kind: String, leaderboardId: String?) -> Bool in
      guard GKLocalPlayer.local.isAuthenticated,
        let presenter = self.appContext?.utilities?.currentViewController()
      else {
        return false
      }
      let controller: GKGameCenterViewController
      if kind == "leaderboard", let leaderboardId {
        controller = GKGameCenterViewController(
          leaderboardID: leaderboardId, playerScope: .global, timeScope: .allTime)
      } else if kind == "achievements" {
        controller = GKGameCenterViewController(state: .achievements)
      } else {
        controller = GKGameCenterViewController(state: .leaderboards)
      }
      controller.gameCenterDelegate = self.dashboardDelegate
      presenter.present(controller, animated: true)
      return true
    }.runOnQueue(.main)
  }
}

/// Game Center ekranı kapatılınca onu ekrandan kaldırır.
private class DashboardDelegate: NSObject, GKGameCenterControllerDelegate {
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
  }
}
