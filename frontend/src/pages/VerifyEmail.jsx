import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import { CheckCircle, XCircle, GitBranch } from 'lucide-react';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
          <GitBranch className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Email Verification</h1>

          {status === 'loading' && (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto" />
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">Your email has been verified successfully!</p>
              <Link to="/login" className="inline-block py-2.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium">Sign in</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">Invalid or expired verification link.</p>
              <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">Back to login</Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
