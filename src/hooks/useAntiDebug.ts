import { useEffect } from 'react';

export const useAntiDebug = () => {
    useEffect(() => {
        // ONLY run in production
        if (process.env.NODE_ENV !== 'production') return;

        const redirectHome = () => {
            window.location.replace('/');
        };

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
                redirectHome();
                return false;
            }
        };

        // 3. Detect Resize (Docked DevTools)
        // If the window's outer size is significantly larger than the inner size, DevTools might be open.
        const handleResize = () => {
            const threshold = 160;
            const widthDiff = window.outerWidth - window.innerWidth;
            const heightDiff = window.outerHeight - window.innerHeight;

            if (widthDiff > threshold || heightDiff > threshold) {
                redirectHome();
            }
        };

        // Check initially
        handleResize();

        // 4. Debugger Loop (The "Tricky" Pause & Redirect)
        const antiDebugLoop = setInterval(() => {
            const start = Date.now();

            // Execute debugger statement
            (function () { }.constructor('debugger')());

            const end = Date.now();

            // If execution took longer than 100ms, it means the debugger paused execution
            if (end - start > 100) {
                redirectHome();
            }
        }, 500);

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
            clearInterval(antiDebugLoop);
        };
    }, []);
};
