import React, { useState } from 'react'
import { Minus, X, Square, SquareDashed } from "lucide-react";
import { appWindow } from '@tauri-apps/api/window';
import "./style.scss";

const WindowControls = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    const minimize = () => appWindow.minimize();
    
    const maximize = () => {
        appWindow.toggleMaximize()
            .then(() => {
                setIsMaximized(!isMaximized);
            })
            .catch((err) => {
                console.error("Error toggling maximize:", err);
            });
    };
    
    const close = () => appWindow.close();

    appWindow.onResized(() => {
        appWindow.isMaximized().then((maximized) => {
            setIsMaximized(maximized);
        }).catch((err) => {
            console.error("Error checking if window is maximized:", err);
        });
    })

    return (
        <div className='window-controls'>
            <div className="window-controls__item" onClick={minimize}>
                <Minus size={12}/>
            </div>
            <div className="window-controls__item" onClick={maximize}>
                {isMaximized ? <SquareDashed size={12} /> : <Square size={12} />}
            </div>
            <div className="window-controls__item close" onClick={close}>
                <X size={16}/>
            </div>
        </div>
    )
}

export default WindowControls