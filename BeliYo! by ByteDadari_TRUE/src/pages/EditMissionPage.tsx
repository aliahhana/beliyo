import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import type { Mission } from '../lib/supabase'

const EditMissionPage: React.FC = () => {
  const navigate = useNavigate()
  const { missionId } = useParams<{ missionId: string }>()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mission, setMission] = useState<Mission | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    reward: '',
    notes: '',
    due_date: ''
  })

  // Fetch mission data
  useEffect(() => {
    const fetchMission = async () => {
      if (!missionId || !user) return

      try {
        const { data, error } = await supabase
          .from('missions')
          .select('*')
          .eq('id', missionId)
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching mission:', error)
          alert('Mission not found or you do not have permission to edit it.')
          navigate('/mission-board')
          return
        }

        setMission(data)
        setFormData({
          title: data.title || '',
          category: data.category || '',
          location: data.location || '',
          reward: data.reward || '',
          notes: data.notes || '',
          due_date: data.due_date ? data.due_date.split('T')[0] : ''
        })
      } catch (error) {
        console.error('Error fetching mission:', error)
        alert('Failed to load mission data.')
        navigate('/mission-board')
      } finally {
        setLoading(false)
      }
    }

    fetchMission()
  }, [missionId, user, navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    if (!missionId || !user || !mission) return

    // Validation
    if (!formData.title.trim() || !formData.category) {
      alert('Please fill in all required fields (Title, Category).')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('missions')
        .update({
          title: formData.title.trim(),
          category: formData.category,
          location: formData.location.trim(),
          reward: formData.reward.trim(),
          notes: formData.notes.trim(),
          due_date: formData.due_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating mission:', error)
        alert('Failed to update mission. Please try again.')
        return
      }

      alert('Mission updated successfully!')
      navigate('/mission-board')
    } catch (error) {
      console.error('Error updating mission:', error)
      alert('Failed to update mission. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!missionId || !user || !mission) return

    const confirmDelete = window.confirm('Are you sure you want to delete this mission? This action cannot be undone.')
    if (!confirmDelete) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting mission:', error)
        alert('Failed to delete mission. Please try again.')
        return
      }

      alert('Mission deleted successfully!')
      navigate('/mission-board')
    } catch (error) {
      console.error('Error deleting mission:', error)
      alert('Failed to delete mission. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header variant="shop" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading mission...</div>
        </div>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header variant="shop" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Mission not found.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header variant="shop" />
      
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/mission-board')}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Edit Mission</h1>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter mission title"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select a category</option>
                <option value="Delivery">Delivery</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Shopping">Shopping</option>
                <option value="Pet Care">Pet Care</option>
                <option value="Tutoring">Tutoring</option>
                <option value="Tech Support">Tech Support</option>
                <option value="Moving">Moving</option>
                <option value="Gardening">Gardening</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Where should this be done?"
              />
            </div>

            {/* Reward */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward
              </label>
              <input
                type="text"
                name="reward"
                value={formData.reward}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="What's the reward? (e.g., $50, Free meal, etc.)"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Any additional information or requirements"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Mission
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/mission-board')}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditMissionPage
