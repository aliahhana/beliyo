import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const AddMissionPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [location, setLocation] = useState('')
  const [customLocation, setCustomLocation] = useState('')
  const [reward, setReward] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const categories = [
    'Food & Beverages',
    'Shopping & Errands',
    'Pet Care',
    'Tutoring & Study Help',
    'Transportation',
    'Tech Support',
    'Language Exchange',
    'Event Help',
    'Household Tasks',
    'Others'
  ]

  const locations = [
    'Seoul National University (SNU)',
    'Korea Advanced Institute of Science and Technology (KAIST)',
    'Pohang University of Science and Technology (POSTECH)',
    'Yonsei University',
    'Korea University',
    'Sungkyunkwan University (SKKU)',
    'Hanyang University',
    'Kyung Hee University',
    'Ewha Womans University',
    'Sogang University',
    'Chung-Ang University',
    'Hankuk University of Foreign Studies (HUFS)',
    'Inha University',
    'Ajou University',
    'Konkuk University',
    'Dongguk University',
    'Hongik University',
    'Kookmin University',
    'Sejong University',
    'Dankook University',
    'Others'
  ]

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      navigate('/login')
      return
    }

    const finalLocation = location === 'Others' ? customLocation : location

    if (!title || !category || !finalLocation) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('missions')
        .insert([
          {
            user_id: user.id,
            title,
            description: title, // Use title as description for backward compatibility
            category,
            due_date: dueDate || null,
            location: finalLocation,
            reward: reward || null,
            notes: notes || null,
            status: 'pending'
          }
        ])
        .select()

      if (error) {
        console.error('Error posting mission:', error)
        alert('Failed to post mission. Please try again.')
        return
      }

      console.log('Mission posted successfully:', data)
      alert('Mission posted successfully!')
      navigate('/mission-board')
    } catch (error) {
      console.error('Error posting mission:', error)
      alert('Failed to post mission. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="bg-[#B91C1C] text-white p-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/mission-board')}
              className="hover:text-red-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Add Mission Request</h1>
          </div>
        </div>

        {/* Form */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mission Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mission Title: *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Buy Malaysian snacks from store"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category: *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent bg-white"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location: *
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent bg-white"
                required
              >
                <option value="">Select your university</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Custom Location Input - Shows when Others is selected */}
            {location === 'Others' && (
              <div>
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="Please specify your location"
                  className="w-full px-4 py-3 border border-red-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
                  required
                />
              </div>
            )}

            {/* Reward/Compensation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward/Compensation:
              </label>
              <input
                type="text"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g., ₩10,000 or Coffee or Badge points"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requirements or preferences..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B91C1C] text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting Mission...' : 'Post Mission Request'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button 
              onClick={() => navigate('/mission-board')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Add Mission Request</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mission Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mission Title: *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Buy Malaysian snacks from store"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent text-lg"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category: *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent bg-white text-lg"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent text-lg"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location: *
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent bg-white text-lg"
                required
              >
                <option value="">Select your university</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Custom Location Input - Shows when Others is selected */}
            {location === 'Others' && (
              <div>
                <input
                  type="text"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  placeholder="Please specify your location"
                  className="w-full px-4 py-3 border border-red-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent text-lg"
                  required
                />
              </div>
            )}

            {/* Reward/Compensation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward/Compensation:
              </label>
              <input
                type="text"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g., ₩10,000 or Coffee or Badge points"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent text-lg"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requirements or preferences..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B91C1C] text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Posting Mission...' : 'Post Mission Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddMissionPage
