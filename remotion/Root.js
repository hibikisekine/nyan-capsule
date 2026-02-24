import { Composition } from 'remotion';
import { MyVideo } from './MyVideo';

export const RemotionRoot = () => {
    return (
        <>
            <Composition
                id="CatDigest"
                component={MyVideo}
                durationInFrames={150}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{
                    title: "今日のにゃんこ",
                    catEmoji: "🐱"
                }}
            />
        </>
    );
};
