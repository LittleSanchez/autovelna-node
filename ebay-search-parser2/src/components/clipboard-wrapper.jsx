import { useRef } from "react";

const ClipboardWrapper = ({ children }) => {
    const wrapperRef = useRef();
    const clipboardRef = useRef();
    const handleClick = (e) => {
        const data = wrapperRef.current.innerHTML;
        clipboardRef.current.style.display = 'block';
        clipboardRef.current.value = data;
        console.log(clipboardRef.current.value);
        clipboardRef.current.select();
        document.execCommand("copy");
        clipboardRef.current.style.display = 'none';

        e.target.focus();
    };
    return (
        <div>
            <button onClick={handleClick}>Copy</button>
            <input
                type="text"
                style={{ position: "absolute", display: 'none' }}
                ref={clipboardRef}
            />
            <div ref={wrapperRef}>{children}</div>
        </div>
    );
};

export default ClipboardWrapper;
