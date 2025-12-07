from playwright.sync_api import sync_playwright

def verify_livreur_interface():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock user's geolocation
        context = browser.new_context(geolocation={"latitude": 43.1242, "longitude": 5.928}, permissions=["geolocation"])
        page = context.new_page()

        # Inject mock Google Apps Script API
        page.add_init_script("""
            window.google = {
                script: {
                    run: {
                        withSuccessHandler: function(successCallback) {
                            return {
                                withFailureHandler: function(failureCallback) {
                                    return {
                                        rpc_getDailyReservations: function() {
                                            setTimeout(() => {
                                                successCallback({
                                                    status: 'success',
                                                    date: '24/05/2025',
                                                    data: [
                                                        {
                                                            startTime: '09:00',
                                                            title: 'Livraison Pharmacie du Port',
                                                            description: 'Colis urgent + frigo'
                                                        },
                                                        {
                                                            startTime: '10:30',
                                                            title: 'EHPAD Les Mimosas',
                                                            description: '3 cartons'
                                                        }
                                                    ]
                                                });
                                            }, 500);
                                        },
                                        rpc_loadData: function() {
                                            setTimeout(() => {
                                                successCallback({
                                                    status: 'success',
                                                    data: [
                                                        { nom: 'Pharmacie Test', lat: 43.1242, lng: 5.928, id: 'TEST1' }
                                                    ]
                                                });
                                            }, 500);
                                        }
                                    };
                                }
                            };
                        }
                    }
                }
            };
        """)

        # Load the local HTML file
        # Note: We need to use absolute path.
        import os
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/App_Livreur/Index.html")

        # Wait for reservations to appear
        page.wait_for_selector(".resa-card")

        # Take screenshot
        page.screenshot(path="verification/app_livreur_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_livreur_interface()
