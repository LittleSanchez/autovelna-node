const Loading = ({ loading }) => {
    return (
        <>
            {loading && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}>
                    <h1>Loading</h1>
                </div>
            )}
        </>
    );
};
export default Loading;
