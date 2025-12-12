from playwright.sync_api import sync_playwright
import os

def verify_chat_ux():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get absolute path
        cwd = os.getcwd()
        file_path = f"file://{cwd}/Projet_ELS/Chat_Piluleur_Interface.html"
        print(f"Navigating to: {file_path}")

        page.goto(file_path)

        # 1. Verify FAB button exists and has text
        fab = page.locator("#fab-btn")
        # Take screenshot of initial state
        page.screenshot(path="verification/chat_initial.png")
        print("Initial screenshot taken")

        # 2. Click FAB to open chat
        fab.click()

        # 3. Verify Chat Window opens
        chat_window = page.locator("#chat-window")
        # Wait for animation/transition if needed
        page.wait_for_timeout(500)

        # 4. Verify Close Button has aria-label
        close_btn = page.locator("#chat-window button[onclick='toggleChat()']")
        aria_label_close = close_btn.get_attribute("aria-label")
        print(f"Close button aria-label: {aria_label_close}")
        if aria_label_close != "Fermer la discussion":
             print("FAIL: Close button aria-label missing or incorrect")

        # 5. Verify Send Button has aria-label and is disabled initially
        send_btn = page.locator("#send-btn")
        aria_label_send = send_btn.get_attribute("aria-label")
        print(f"Send button aria-label: {aria_label_send}")

        is_disabled = send_btn.is_disabled()
        print(f"Send button initially disabled: {is_disabled}")

        # Take screenshot of open chat with empty input
        page.screenshot(path="verification/chat_open.png")

        # 6. Type in input and verify button enables
        input_field = page.locator("#user-input")
        input_field.fill("Hello")

        # Trigger input event if fill doesn't (Playwright fill usually triggers events)
        # But we added oninput="updateSendButtonState()"

        is_enabled = not send_btn.is_disabled()
        print(f"Send button enabled after typing: {is_enabled}")

        # 7. Clear input and verify button disables
        input_field.fill("")
        is_disabled_again = send_btn.is_disabled()
        print(f"Send button disabled after clearing: {is_disabled_again}")

        # 8. Type again to leave in good state for screenshot
        input_field.fill("Help me with delivery")
        page.screenshot(path="verification/chat_conversation.png")

        browser.close()

if __name__ == "__main__":
    verify_chat_ux()
