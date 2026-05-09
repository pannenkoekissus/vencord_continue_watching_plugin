import { definePlugin } from "vencord/utils";
import { findByStoreName } from "vencord/webpack";

let originalHasFocus: () => boolean;
let originalIsFocused: (() => boolean) | undefined;
let eventHandler: (e: Event) => void;

export default definePlugin({
    name: "ContinueWatching",
    description: "Continues playing quest videos when Discord loses focus by overriding window focus state.",
    authors: [{ name: "Antigravity", id: "0" }],
    
    start() {
        // 1. Override document.hasFocus
        originalHasFocus = document.hasFocus;
        document.hasFocus = () => true;

        // 2. Override visibility API properties
        Object.defineProperty(document, "visibilityState", {
            get: () => "visible",
            configurable: true
        });

        Object.defineProperty(document, "hidden", {
            get: () => false,
            configurable: true
        });

        // 3. Prevent blur and visibilitychange events from being handled
        eventHandler = (e: Event) => {
            e.stopImmediatePropagation();
            e.stopPropagation();
        };

        window.addEventListener("blur", eventHandler, true);
        document.addEventListener("visibilitychange", eventHandler, true);

        // 4. Override Discord's internal WindowStore focus state
        try {
            const WindowStore = findByStoreName("WindowStore");
            if (WindowStore && typeof WindowStore.isFocused === "function") {
                originalIsFocused = WindowStore.isFocused;
                WindowStore.isFocused = () => true;
            }
        } catch (err) {
            console.error("[ContinueWatching] Failed to patch WindowStore", err);
        }
    },

    stop() {
        // Restore document.hasFocus
        if (originalHasFocus) {
            document.hasFocus = originalHasFocus;
        }

        // Restore visibility API
        delete (document as any).visibilityState;
        delete (document as any).hidden;

        // Remove event listeners
        if (eventHandler) {
            window.removeEventListener("blur", eventHandler, true);
            document.removeEventListener("visibilitychange", eventHandler, true);
        }

        // Restore WindowStore
        try {
            const WindowStore = findByStoreName("WindowStore");
            if (WindowStore && originalIsFocused) {
                WindowStore.isFocused = originalIsFocused;
            }
        } catch (err) {
            console.error("[ContinueWatching] Failed to unpatch WindowStore", err);
        }
    }
});
