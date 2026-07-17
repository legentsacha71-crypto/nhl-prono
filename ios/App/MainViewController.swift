import UIKit
import Capacitor

// Capacitor désactive par défaut le "bounce" (effet de rebond élastique)
// de la WKWebView, ce qui donne une sensation de scroll rigide, pas
// vraiment native iOS. On le réactive ici, ainsi que le ralentissement
// naturel de l'inertie, pour retrouver le comportement standard iOS.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
        webView?.scrollView.decelerationRate = .normal
    }
}
