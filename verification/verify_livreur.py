
import os
from playwright.sync_api import sync_playwright

def verify_livreur_accessibility():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the HTML file directly.
        # Since the file relies on google.script.run, we need to mock it.
        # We can inject a script to mock google.script.run and provide dummy data.

        filepath = os.path.abspath("App_Livreur/Index.html")
        page.goto(f"file://{filepath}")

        # Inject mock data and trigger rendering
        mock_script = """
        window.google = {
            script: {
                run: {
                    withSuccessHandler: function(successCallback) {
                        this.successCallback = successCallback;
                        return this;
                    },
                    withFailureHandler: function(failureCallback) {
                        return this;
                    },
                    getListeTournees: function(email) {
                        const mockTournees = [
                            {
                                client_nom: "Pharmacie Centrale",
                                event_id: "evt123",
                                arrets: [
                                    {
                                        livraison_id: "liv1",
                                        nom: "EHPAD Les Oliviers",
                                        type_arret: "Livraison",
                                        status: "À_livrer",
                                        note: ""
                                    },
                                    {
                                        livraison_id: "liv2",
                                        nom: "Mme Dupont",
                                        type_arret: "Livraison",
                                        status: "Livrée",
                                        note: "RAS"
                                    }
                                ]
                            }
                        ];
                        setTimeout(() => this.successCallback(mockTournees), 100);
                    },
                    enregistrerStatutLivraison: function() {}
                }
            }
        };

        // Manually trigger initApp since DOMContentLoaded might have already fired
        if (typeof initApp === 'function') {
            initApp();
        }
        """

        page.evaluate(mock_script)

        # Wait for the tournées to load
        page.wait_for_selector(".tournee-card")

        # Verify the aria-label on the textarea
        # We look for the textarea associated with "EHPAD Les Oliviers"
        # The id is `note-liv1` based on the mock data

        textarea = page.locator("#note-liv1")
        aria_label = textarea.get_attribute("aria-label")

        print(f"Found aria-label: {aria_label}")

        if aria_label == "Note ou anomalie pour EHPAD Les Oliviers":
            print("SUCCESS: aria-label is correct.")
        else:
            print(f"FAILURE: aria-label is incorrect. Expected 'Note ou anomalie pour EHPAD Les Oliviers', got '{aria_label}'")

        # Take a screenshot
        page.screenshot(path="verification/verification.png")

        browser.close()

if __name__ == "__main__":
    verify_livreur_accessibility()
