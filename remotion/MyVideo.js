import { AbsoluteFill, Sequence, Video, Audio, Img, useVideoConfig, interpolate, spring, useCurrentFrame } from 'remotion';
import React from 'react';

const Particle = ({ emoji, delay }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const opacity = interpolate(frame - delay, [0, 20, 50, 75], [0, 0.4, 0.4, 0]);
    const y = interpolate(frame - delay, [0, 75], [0, -100]);
    const x = Math.sin(frame / 10) * 10;

    if (frame < delay) return null;

    return (
        <div style={{
            position: 'absolute',
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            fontSize: 40,
            opacity,
            transform: `translate(${x}px, ${y}px)`,
        }}>
            {emoji}
        </div>
    );
};

const Slide = ({ entry, cat, index }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = interpolate(
        frame,
        [0, 10, 65, 75],
        [0, 1, 1, 0]
    );

    const scale = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 100 },
    });

    const textSlide = spring({
        frame: frame - 15,
        fps,
        config: { damping: 15 },
    });

    return (
        <AbsoluteFill style={{
            backgroundColor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity
        }}>
            {/* Background with slight blur */}
            {entry.mediaUrl && (
                <AbsoluteFill style={{ filter: 'blur(30px)', opacity: 0.2, transform: 'scale(1.1)' }}>
                    {entry.mediaType === 'video' ? (
                        <Video src={entry.mediaUrl} muted style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    ) : (
                        <Img src={entry.mediaUrl} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    )}
                </AbsoluteFill>
            )}

            {/* Particles */}
            {[...Array(5)].map((_, i) => (
                <Particle key={i} emoji={entry.mediaEmoji} delay={i * 10} />
            ))}

            {/* Main Content Card */}
            <div style={{
                width: '85%',
                height: '75%',
                background: 'white',
                borderRadius: 48,
                boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transform: `scale(${scale})`,
                border: '1px solid rgba(0,0,0,0.05)'
            }}>
                <div style={{ flex: 1, backgroundColor: entry.mediaColor || '#ff9f43', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {entry.mediaUrl ? (
                        entry.mediaType === 'video' ? (
                            <Video src={entry.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <Img src={entry.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )
                    ) : (
                        <div style={{ fontSize: 160, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' }}>{entry.mediaEmoji}</div>
                    )}
                    <div style={{
                        position: 'absolute', top: 30, left: 30,
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        padding: '12px 24px',
                        borderRadius: 24,
                        fontSize: 28,
                        fontWeight: 900,
                        color: '#ff9f43',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                        {entry.displayDate}
                    </div>
                </div>

                <div style={{ padding: '48px 40px', background: 'linear-gradient(to bottom, #ffffff, #fffcf9)', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                        <div style={{
                            fontSize: 54,
                            background: 'white',
                            width: 80, height: 80,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 24,
                            boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
                        }}>{cat.emoji}</div>
                        <div style={{
                            flex: 1,
                            transform: `translateY(${interpolate(textSlide, [0, 1], [30, 0])}px)`,
                            opacity: textSlide
                        }}>
                            <div style={{ fontSize: 20, color: '#ff9f43', fontWeight: 900, marginBottom: 12, letterSpacing: 1 }}>
                                {cat.name}のきもち
                            </div>
                            <div style={{ fontSize: 32, color: '#2d3436', lineHeight: 1.5, fontWeight: 800 }}>
                                {entry.catReaction || '（考え中だにゃ...）'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Soft Vignette Overlay */}
            <AbsoluteFill style={{
                boxShadow: 'inset 0 0 200px rgba(255,159,67,0.1)',
                pointerEvents: 'none'
            }} />
        </AbsoluteFill>
    );
};

export const NyanCapsuleVideo = ({ entries = [], cat = {} }) => {
    const slideDuration = 75; // 2.5 seconds

    if (!entries.length) {
        return (
            <AbsoluteFill style={{
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                fontWeight: 900,
                color: '#ccc'
            }}>
                まだ思い出がありません🐾
            </AbsoluteFill>
        );
    }

    return (
        <AbsoluteFill style={{ backgroundColor: '#fff' }}>
            {/* Background BGM */}
            <Audio
                src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                volume={0.2}
                placeholder={null}
            />

            {entries.map((entry, i) => (
                <Sequence key={entry.id} from={i * slideDuration} durationInFrames={slideDuration}>
                    <Slide entry={entry} cat={cat} index={i} />
                </Sequence>
            ))}
        </AbsoluteFill>
    );
};
