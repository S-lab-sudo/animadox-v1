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

        // 3. Debugger Loop (The "Tricky" Pause)
        // This constantly calls 'debugger', which pauses execution if DevTools is open.
        // If DevTools is closed, it does nothing perceptible.
        const antiDebugLoop = setInterval(() => {
            // We use an anonymous function constructor to make it harder to find/remove by static analysis source maps
            (function () { }.constructor('debugger')());
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
