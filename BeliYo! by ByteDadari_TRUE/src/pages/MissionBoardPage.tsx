import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MissionCard from '../components/MissionCard'
import Header from '../components/Header'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Mission } from '../lib/supabase'

const MissionBoardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch missions from Supabase
  const fetchMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching missions:', error)
        return
      }

      setMissions(data || [])
    } catch (error) {
      console.error('Error fetching missions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    fetchMissions()

    const channel = supabase
      .channel('missions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missions'
        },
        (payload) => {
          console.log('Real-time update:', payload)
          fetchMissions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleAccept = async (missionId: string) => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      const mission = missions.find(m => m.id === missionId)
      if (!mission) {
        console.error('Mission not found:', missionId)
        alert('Mission not found. Please try again.')
        return
      }

      if (mission.user_id === user.id) {
        alert('You cannot accept your own mission.')
        return
      }

      const { error } = await supabase
        .from('missions')
        .update({
          status: 'accepted',
          accepted_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)

      if (error) {
        console.error('Error accepting mission:', error)
        alert('Failed to accept mission. Please try again.')
        return
      }

      console.log(`Accepted mission ${missionId}`)
      navigate(`/chat/mission/${missionId}/${mission.user_id}`)
      
    } catch (error) {
      console.error('Error accepting mission:', error)
      alert('Failed to accept mission. Please try again.')
    }
  }

  const handleQuit = async (missionId: string) => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      const { error } = await supabase
        .from('missions')
        .update({
          status: 'pending',
          accepted_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', missionId)
        .eq('accepted_by', user.id)

      if (error) {
        console.error('Error quitting mission:', error)
        alert('Failed to quit mission. Please try again.')
        return
      }

      console.log(`Quit mission ${missionId}`)
    } catch (error) {
      console.error('Error quitting mission:', error)
      alert('Failed to quit mission. Please try again.')
    }
  }

  const handleEdit = (missionId: string) => {
    navigate(`/edit-mission/${missionId}`)
  }

  const handleDelete = async (missionId: string) => {
    if (!user) {
      navigate('/login')
      return
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this mission? This action cannot be undone.')
    if (!confirmDelete) return

    try {
      console.log(`Attempting to delete mission ${missionId} for user ${user.id}`)
      
      const { data: missionCheck, error: checkError } = await supabase
        .from('missions')
        .select('id, user_id')
        .eq('id', missionId)
        .eq('user_id', user.id)
        .single()

      if (checkError || !missionCheck) {
        console.error('Mission not found or not owned by user:', checkError)
        alert('Mission not found or you do not have permission to delete it.')
        return
      }

      setMissions(prevMissions => prevMissions.filter(mission => mission.id !== missionId))

      const { data: deletedData, error: deleteError } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId)
        .eq('user_id', user.id)
        .select()

      if (deleteError) {
        console.error('Error deleting mission from database:', deleteError)
        alert('Failed to delete mission. Please try again.')
        await fetchMissions()
        return
      }

      if (!deletedData || deletedData.length === 0) {
        console.error('No mission was deleted - mission may not exist or user lacks permission')
        alert('Failed to delete mission. You may not have permission to delete this mission.')
        await fetchMissions()
        return
      }

      console.log(`Successfully deleted mission ${missionId}:`, deletedData)
      
      setTimeout(() => {
        fetchMissions()
      }, 500)

    } catch (error) {
      console.error('Unexpected error deleting mission:', error)
      alert('Failed to delete mission. Please try again.')
      await fetchMissions()
    }
  }

  const handleAddRequest = () => {
    navigate('/add-mission')
  }

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Filter missions based on search query
      const filteredMissions = missions.filter(mission =>
        mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setMissions(filteredMissions)
      setShowSearch(false)
      setSearchQuery('')
    }
  }

  const handleLogoClick = () => {
    navigate('/')
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'not stated'
    
    const today = new Date()
    const due = new Date(dueDate)
    
    if (due.toDateString() === today.toDateString()) {
      return 'TODAY'
    }
    
    return due.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header variant="shop" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading missions...</div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-white">
        {/* Mobile Header */}
        <div className="bg-[#B91C1C] text-white flex items-center justify-between px-4 py-3">
          <button 
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl font-bold hover:text-red-200 transition-colors">BeliYo!</span>
          </button>
          <span className="text-xl font-medium">Mission Board</span>
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="hover:text-red-200 transition-colors"
          >
            <Search className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="bg-white border-b border-gray-200 p-4">
            <form onSubmit={handleMobileSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search missions..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
              <button
                type="submit"
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false)
                  setSearchQuery('')
                  fetchMissions() // Reset to all missions
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Add Request Button */}
        <div className="flex justify-center mt-4">
          <button
            onClick={handleAddRequest}
            className="bg-red-600 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-lg hover:bg-red-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold text-sm">ADD REQUEST</span>
          </button>
        </div>

        {/* Mission Cards Grid */}
        <div className="grid grid-cols-2 gap-4 p-4">
          {missions.map((mission) => (
            <div key={mission.id} className="bg-white shadow-md rounded-lg p-4 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl mb-2">
                  <span role="img" aria-label="avatar">👤</span>
                </div>
                <p className="text-center text-gray-800 font-medium mb-2">"{mission.title}"</p>
                <p className="text-center text-gray-600 text-sm mb-4">Due {formatDueDate(mission.due_date)}</p>
                {mission.status === 'accepted' && mission.accepted_by === user?.id ? (
                  <button
                    onClick={() => handleQuit(mission.id)}
                    className="bg-gray-600 text-white px-4 py-1 rounded-full font-semibold text-xs uppercase tracking-wide hover:bg-gray-700 transition-colors"
                  >
                    IN PROGRESS
                  </button>
                ) : (
                  <button
                    onClick={() => handleAccept(mission.id)}
                    className="bg-red-600 text-white px-4 py-1 rounded-full font-semibold text-xs uppercase tracking-wide hover:bg-red-700 transition-colors"
                  >
                    ACCEPT CHALLENGE
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Wooden Sign */}
        <div className="flex justify-center mt-8 mb-12">
          <div className="relative">
            <div className="bg-gradient-to-b from-[#D4A574] to-[#B8935A] px-8 py-6 rounded-lg shadow-2xl border-4 border-[#8B6F47] relative">
              <div className="text-center">
                <h3 className="text-[#4A3C28] font-black text-xl mb-1">COMPLETE</h3>
                <h3 className="text-[#4A3C28] font-black text-xl mb-1">MISSION TO</h3>
                <h3 className="text-[#4A3C28] font-black text-xl mb-2">GET BADGES!</h3>
              </div>
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="h-full w-full bg-gradient-to-b from-transparent via-[#8B6F47] to-transparent" style={{ backgroundSize: '100% 4px', backgroundRepeat: 'repeat-y' }}></div>
              </div>
            </div>
            <div className="w-6 h-20 bg-gradient-to-b from-[#8B6F47] to-[#6B5637] mx-auto rounded-b-sm shadow-lg"></div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => navigate('/shop')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">🏪</span>
              <span className="text-xs font-medium">Shop</span>
            </button>
            <button 
              onClick={() => navigate('/money-exchange')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">🔄</span>
              <span className="text-xs font-medium">Exchange</span>
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">💬</span>
              <span className="text-xs font-medium">Chats</span>
            </button>
            <button 
              onClick={() => navigate('/mission')}
              className="flex flex-col items-center py-2 px-3 text-[#B91C1C] font-medium"
            >
              <span className="text-xl mb-1">🎯</span>
              <span className="text-xs font-medium">Mission</span>
            </button>
            <button 
              onClick={() => navigate('/my-page')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">👤</span>
              <span className="text-xs font-medium">MyPage</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header variant="shop" />
      <div className="flex">
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-6 p-8">
            {missions.length === 0 ? (
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-500 text-lg">No missions available at the moment.</p>
                <p className="text-gray-400 mt-2">Be the first to add a mission request!</p>
              </div>
            ) : (
              missions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  avatar="https://i.imgur.com/8RKXAIV.png"
                  title={mission.title}
                  description={mission.description}
                  category={mission.category}
                  location={mission.location}
                  reward={mission.reward}
                  notes={mission.notes}
                  dueDate={formatDueDate(mission.due_date)}
                  isAccepted={mission.status === 'accepted' && mission.accepted_by === user?.id}
                  isOwner={mission.user_id === user?.id}
                  onAccept={() => handleAccept(mission.id)}
                  onQuit={() => handleQuit(mission.id)}
                  onEdit={() => handleEdit(mission.id)}
                  onDelete={() => handleDelete(mission.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="w-[280px] bg-gradient-to-b from-[#B91C1C] to-[#991B1B] min-h-[calc(100vh-64px)] flex flex-col items-center pt-8">
          <button
            onClick={handleAddRequest}
            className="bg-white text-[#B91C1C] px-6 py-3 rounded-full flex items-center gap-3 shadow-lg hover:shadow-xl transition-all mb-auto mt-8"
          >
            <div className="w-8 h-8 bg-[#B91C1C] rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">ADD REQUEST</span>
          </button>

          <div className="mt-auto mb-12">
            <div className="relative">
              <div className="bg-gradient-to-b from-[#D4A574] to-[#B8935A] px-8 py-6 rounded-lg shadow-2xl border-4 border-[#8B6F47] relative">
                <div className="text-center">
                  <h3 className="text-[#4A3C28] font-black text-xl mb-1">COMPLETE</h3>
                  <h3 className="text-[#4A3C28] font-black text-xl mb-1">MISSION TO</h3>
                  <h3 className="text-[#4A3C28] font-black text-xl mb-2">GET BADGES!</h3>
                </div>
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="h-full w-full bg-gradient-to-b from-transparent via-[#8B6F47] to-transparent" style={{ backgroundSize: '100% 4px', backgroundRepeat: 'repeat-y' }}></div>
                </div>
              </div>
              <div className="w-6 h-20 bg-gradient-to-b from-[#8B6F47] to-[#6B5637] mx-auto rounded-b-sm shadow-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MissionBoardPage
