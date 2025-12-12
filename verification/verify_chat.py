from playwright.sync_api import sync_playwright

def verify_chat_interface():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the HTML file
        # Since we are in the repo root, the file is at Projet_ELS/Chat_Piluleur_Interface.html
        # We need to use absolute path for file:// protocol
        import os
        cwd = os.getcwd()
        file_path = f"file://{cwd}/Projet_ELS/Chat_Piluleur_Interface.html"

        # Inject mock google.script.run
        page.add_init_script("""
            window.google = {
                script: {
                    run: {
                        withSuccessHandler: function(successHandler) {
                            this.successHandler = successHandler;
                            return this;
                        },
                        withFailureHandler: function(failureHandler) {
                            this.failureHandler = failureHandler;
                            return this;
                        },
                        processChatRequest: function(data) {
                            console.log('Mock processChatRequest called with:', data);
                            setTimeout(() => {
                                if (this.successHandler) {
                                    this.successHandler({ text: 'Ceci est une réponse simulée de Gemini.' });
                                }
                            }, 500);
                        }
                    }
                }
            };
        """)

        page.goto(file_path)

        # Take initial screenshot
        page.screenshot(path="verification/chat_initial.png")

        # Open the chat
        page.click("#fab-btn")

        # Wait for animation
        page.wait_for_timeout(500)

        page.screenshot(path="verification/chat_open.png")

        # Type a message
        page.fill("#user-input", "Bonjour, je voudrais une livraison.")
        page.click("#send-btn")

        # Wait for response (simulated delay is 500ms)
        page.wait_for_timeout(1000)

        # Take screenshot of conversation
        page.screenshot(path="verification/chat_conversation.png")

        browser.close()

if __name__ == "__main__":
    verify_chat_interface()
