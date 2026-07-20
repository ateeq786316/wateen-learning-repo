import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = 40 }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: size, height: size }}
        className="border-4 border-indigo-200 border-t-indigo-600 rounded-full"
      />
    </div>
  );
}
