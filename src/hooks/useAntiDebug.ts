import { useEffect } from 'react';

export const useAntiDebug = () => {
    useEffect(() => {
        // ONLY run in production
        if (process.env.NODE_ENV !== 'production') return;

        // 1. Disable Right Click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        // 2. Disable Key Shortcuts (F12, Ctrl+Shift+I/J/C/U)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.code === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.code === 'KeyI' || e.code === 'KeyJ' || e.code === 'KeyC')) ||
                (e.ctrlKey && e.code === 'KeyU')
            ) {
                e.preventDefault();
                return false;
            }
        };

        // 3. Debugger Loop (The "Tricky" Pause & Redirect)
        // This constantly calls 'debugger', which pauses execution if DevTools is open.
        // We measure time to detect if parsing happened.
        const antiDebugLoop = setInterval(() => {
            const start = Date.now();

            // Execute debugger statement
            (function () { }.constructor('debugger')());

            const end = Date.now();

            // If execution took longer than 100ms, it means the debugger paused execution
            // This implies DevTools is open.
            if (end - start > 100) {
                // Redirect user to home page effectively "soft locking" them out of context
                window.location.replace('/');
            }
        }, 500); // Check every 500ms (balanced to avoid freezing too hard, but annoying enough)

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            clearInterval(antiDebugLoop);
        };
    }, []);
};
