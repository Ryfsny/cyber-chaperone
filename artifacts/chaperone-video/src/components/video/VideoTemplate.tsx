import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { SceneCommunity } from './video_scenes/SceneCommunity';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { SceneRescue } from './video_scenes/SceneRescue';
import { Scene5 } from './video_scenes/Scene5';
import { SceneJoin } from './video_scenes/SceneJoin';

export const SCENE_DURATIONS: Record<string, number> = {
  intro: 4500,
  journey: 4000,
  community: 5000,
  checkin: 4500,
  danger: 5000,
  rescue: 4500,
  arrival: 4000,
  join: 5500,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene1,
  journey: Scene2,
  community: SceneCommunity,
  checkin: Scene3,
  danger: Scene4,
  rescue: SceneRescue,
  arrival: Scene5,
  join: SceneJoin,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#1a1f2e] text-white">
      {/* Persistent ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[120px] opacity-10"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent)', top: '-20%', left: '-20%' }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
