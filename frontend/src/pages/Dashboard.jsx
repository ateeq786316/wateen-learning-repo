import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { User, Upload, Shield, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    { icon: User, label: 'Account Type', value: user?.provider || 'LOCAL', color: 'bg-blue-100 text-blue-600' },
    { icon: Shield, label: 'Role', value: user?.role || 'USER', color: 'bg-purple-100 text-purple-600' },
    { icon: Calendar, label: 'Joined', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-', color: 'bg-green-100 text-green-600' },
    { icon: Upload, label: 'Email Verified', value: user?.emailVerified ? 'Yes' : 'No', color: user?.emailVerified ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color} mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 bg-white rounded-xl border border-gray-100 shadow-sm p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
        <div className="space-y-3">
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Provider', value: user?.provider },
            { label: 'Age', value: user?.age ?? '-' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
