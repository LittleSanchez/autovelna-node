import React, { useRef } from "react";
import { useState } from "react";

const FileLoader = ({onFileLoad}) => {
    const [file, setFile] = useState(null);

    const fileInputRef = useRef(null)

    const handleOpenFile = () => {
        fileInputRef.current.click();
    }

    const handleFileChange = (e) => {
        const fileReader = new FileReader();
        fileReader.readAsText(e.target.files[0], 'UTF-8');
        fileReader.onload = e => {
            console.log('e.target.result: ', e.target.result);
            setFile(e.target.result);
            onFileLoad(e.target.result);
        }
    }

    return <div>
        <input onChange={handleFileChange} ref={fileInputRef} type="file" name="profucts-load" id="products-load" style={{display: 'none'}} />
        <button onClick={handleOpenFile}>Load raw products from file</button>
    </div>
}

export default FileLoader;