import UIKit
import Capacitor
import WebKit

// Capacitor désactive par défaut le "bounce" (effet de rebond élastique)
// de la WKWebView, ce qui donne une sensation de scroll rigide, pas
// vraiment native iOS. On le réactive ici, ainsi que le ralentissement
// naturel de l'inertie, pour retrouver le comportement standard iOS.
class MainViewController: CAPBridgeViewController {
    // Par défaut, WKWebView exige un geste utilisateur pour lancer TOUTE
    // lecture média (même une vidéo muette en `autoplay`) : c'est ce qui
    // fait apparaître le gros bouton "play" natif sur la vidéo d'intro
    // (AppSplash) au lancement de l'appli. Capacitor ne configure que
    // `allowsInlineMediaPlayback` (qui empêche juste le plein écran auto),
    // pas cette exigence de geste. La vidéo d'intro est purement
    // décorative (son coupé, pas de contenu audio à protéger), donc on
    // supprime complètement l'exigence de geste plutôt que de se fier à
    // l'exception "autoplay muet" du web (déjà tentée côté JS sans succès).
    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.mediaTypesRequiringUserActionForPlayback = []
        return config
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
        webView?.scrollView.decelerationRate = .normal
    }
}
