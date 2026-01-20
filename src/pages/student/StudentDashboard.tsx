// Re-export the existing Index page as StudentDashboard
// This is a wrapper to maintain the new route structure
import Index from '@/pages/Index';

const StudentDashboard = () => {
  return <Index />;
};

export default StudentDashboard;
