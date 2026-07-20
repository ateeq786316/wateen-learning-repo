import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <h1 className="text-8xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">404</h1>
        <p className="text-xl text-gray-500 mt-4">Page not found</p>
        <p className="text-gray-400 mt-2">The page you're looking for doesn't exist.</p>
        <Link to="/" className="inline-flex items-center gap-2 mt-8 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow">
          <Home className="w-4 h-4" /> Go home
        </Link>
      </motion.div>
    </div>
  );
}
