import { motion } from 'framer-motion';

export function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-arc-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white/30 font-mono text-xs tracking-widest">{text}</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return <div className="h-40 shimmer rounded-2xl" />;
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="h-12 shimmer rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center px-6">
      {Icon && <Icon size={48} className="text-white/10 mb-4" strokeWidth={1} />}
      <p className="font-display font-semibold text-lg text-white/40 mb-2">{title}</p>
      {description && <p className="text-sm text-white/20 mb-6 max-w-xs">{description}</p>}
      {action}
    </motion.div>
  );
}
