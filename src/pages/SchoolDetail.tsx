import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Trash2,
  Users,
  GraduationCap,
  BookOpen,
  AlertCircle
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  school_code: string;
  address: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone: string;
  email: string;
  principal_name: string;
  website: string;
  student_count: number;
  created_at: string;
  updated_at: string;
  onboarded: number;
  premium_school?: number;
  storage_used_bytes?: number;
  storage_limit_bytes?: number;
}

interface SchoolUser {
  id: string;
  role: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Class {
  id: string;
  name: string;
  description?: string;
  grade_level: string;
  school_year?: string;
  is_active: boolean;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  enrollment_date: string;
  status: string;
}

export default function SchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [school, setSchool] = useState<School | null>(null);
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    school_code: '',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    phone: '',
    email: '',
    principal_name: '',
    website: '',
    student_count: 0,
    premium_school: 0,
    storage_limit_bytes: 0,
    onboarded: 0,
  });

  useEffect(() => {
    if (id) {
      fetchSchoolData();
    }
  }, [id]);

  const fetchSchoolData = async () => {
    try {
      setLoading(true);

      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (schoolError) throw schoolError;
      if (!schoolData) {
        navigate('/schools');
        return;
      }

      setSchool(schoolData);
      setEditForm({
        name: schoolData.name || '',
        school_code: schoolData.school_code || '',
        address: schoolData.address || '',
        city: schoolData.city || '',
        postal_code: schoolData.postal_code || '',
        country: schoolData.country || 'Netherlands',
        phone: schoolData.phone || '',
        email: schoolData.email || '',
        principal_name: schoolData.principal_name || '',
        website: schoolData.website || '',
        student_count: schoolData.student_count || 0,
        premium_school: schoolData.premium_school || 0,
        storage_limit_bytes: schoolData.storage_limit_bytes || 5368709120,
        onboarded: schoolData.onboarded || 0,
      });

      // Fetch users with a manual approach
      const { data: rawUsersData, error: usersError } = await supabase
        .from('school_teammembers')
        .select('id, role, user_id')
        .eq('school_id', id);

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Fetch profile data for each user
      let usersData: SchoolUser[] = [];
      if (rawUsersData && rawUsersData.length > 0) {
        const userIds = rawUsersData.map(u => u.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combine the data
        usersData = rawUsersData.map(user => ({
          id: user.id,
          role: user.role,
          user_id: user.user_id,
          profiles: profilesData?.find(p => p.id === user.user_id) || {
            first_name: '',
            last_name: '',
            email: ''
          }
        }));
      }

      const { data: classesData, error: classesError } = await supabase
        .from('groups')
        .select('*')
        .eq('school_id', id)
        .order('name');

      if (classesError) {
        console.error('Error fetching classes:', classesError);
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', id)
        .order('last_name');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
      }

      setUsers(usersData || []);
      setClasses(classesData || []);
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching school data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      console.log('Saving school data:', editForm);
      console.log('School ID:', id);

      if (!id) {
        throw new Error('School ID is missing');
      }

      const updateData = {
        name: editForm.name,
        school_code: editForm.school_code,
        address: editForm.address || null,
        city: editForm.city || null,
        postal_code: editForm.postal_code || null,
        country: editForm.country || 'Netherlands',
        phone: editForm.phone || null,
        email: editForm.email || null,
        principal_name: editForm.principal_name || null,
        website: editForm.website || null,
        student_count: editForm.student_count,
        premium_school: editForm.premium_school,
        storage_limit_bytes: editForm.storage_limit_bytes,
        onboarded: editForm.onboarded,
        updated_at: new Date().toISOString(),
      };

      console.log('Update payload:', updateData);

      const { data, error } = await supabase
        .from('schools')
        .update(updateData)
        .eq('id', id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('Successfully updated school:', data[0]);
      }

      await fetchSchoolData();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating school:', error);
      alert(`Failed to update school: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/schools');
    } catch (error) {
      console.error('Error deleting school:', error);
      alert('Failed to delete school. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">School not found</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/schools')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Schools
        </button>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {isEditing ? 'Edit School' : school.name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{school.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Principal Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.principal_name}
                onChange={(e) => setEditForm({ ...editForm, principal_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{school.principal_name || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{school.email || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{school.phone || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            {isEditing ? (
              <input
                type="url"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">
                {school.website ? (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {school.website}
                  </a>
                ) : (
                  'N/A'
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Code
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.school_code}
                onChange={(e) => setEditForm({ ...editForm, school_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            ) : (
              <p className="text-gray-900">{school.school_code || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{school.address || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{school.city || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postal Code
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.postal_code}
                onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{school.postal_code || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{school.country || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Count
            </label>
            {isEditing ? (
              <input
                type="number"
                value={editForm.student_count}
                onChange={(e) => setEditForm({ ...editForm, student_count: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            ) : (
              <p className="text-gray-900">{school.student_count || 0}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premium School
            </label>
            {isEditing ? (
              <select
                value={editForm.premium_school}
                onChange={(e) => setEditForm({ ...editForm, premium_school: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>No (0)</option>
                <option value={1}>Yes (1)</option>
              </select>
            ) : (
              <p className="text-gray-900">
                {school.premium_school === 1 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Standard
                  </span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Limit (GB)
            </label>
            {isEditing ? (
              <input
                type="number"
                value={Math.round(editForm.storage_limit_bytes / (1024 * 1024 * 1024))}
                onChange={(e) => setEditForm({ ...editForm, storage_limit_bytes: parseInt(e.target.value) * 1024 * 1024 * 1024 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            ) : (
              <p className="text-gray-900">{Math.round((school.storage_limit_bytes || 0) / (1024 * 1024 * 1024))} GB</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Onboarded
            </label>
            {isEditing ? (
              <select
                value={editForm.onboarded}
                onChange={(e) => setEditForm({ ...editForm, onboarded: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>No (0)</option>
                <option value={1}>Yes (1)</option>
              </select>
            ) : (
              <p className="text-gray-900">
                {school.onboarded === 1 ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    No
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage & Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Used
              </label>
              <p className="text-gray-900">
                {Math.round((school.storage_used_bytes || 0) / (1024 * 1024))} MB of {Math.round((school.storage_limit_bytes || 0) / (1024 * 1024 * 1024))} GB
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, ((school.storage_used_bytes || 0) / (school.storage_limit_bytes || 1)) * 100)}%`
                  }}
                ></div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created At
              </label>
              <p className="text-gray-900">
                {new Date(school.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Updated
              </label>
              <p className="text-gray-900">
                {new Date(school.updated_at).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School ID
              </label>
              <p className="text-gray-900 text-sm font-mono">{school.id}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Connected Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-orange-100 p-3 rounded-lg">
              <GraduationCap className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Connected Users
        </h2>
        {users.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No users connected to this school</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">
                      {user.profiles?.first_name && user.profiles?.last_name
                        ? `${user.profiles.first_name} ${user.profiles.last_name}`
                        : user.profiles?.email || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.profiles?.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Classes
        </h2>
        {classes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No classes available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div key={cls.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-2">{cls.name}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Grade: {cls.grade_level || 'N/A'}</p>
                  {cls.description && <p>Description: {cls.description}</p>}
                  {cls.school_year && <p>Year: {cls.school_year}</p>}
                  <p>Status: <span className={cls.is_active ? 'text-green-600' : 'text-gray-400'}>{cls.is_active ? 'Active' : 'Inactive'}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Students
        </h2>
        {students.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No students enrolled</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Grade</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Enrollment Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{student.grade_level || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(student.enrollment_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          student.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : student.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete School
                </h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete <strong>{school.name}</strong>? This action cannot be undone and will also delete all associated classes and students.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    Delete School
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
