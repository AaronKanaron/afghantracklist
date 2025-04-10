import { Banana } from "lucide-react";
import "./style.scss";

import WindowControls from './window-controls/WindowControls';

const Navbar = () => {
    return (
        <div className='header' data-tauri-drag-region>
            <div className="title-bar">
                <Banana size={16}/>
                <span>Afghan tracklist</span>
            </div>
            <div className='controls'>
                <WindowControls />
            </div>
        </div>
    );
}

export default Navbar;