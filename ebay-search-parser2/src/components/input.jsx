const Input = ({ name, label, value, onChange }) => {
    return (
        <div>
            <label htmlFor={name}>{label}</label>
            <input
                type={"text"}
                name={name}
                value={value}
                onChange={onChange}
            />
        </div>
    );
};
