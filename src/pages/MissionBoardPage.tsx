import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MissionCard from '../components/MissionCard'
import Header from '../components/Header'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Mission } from '../lib/supabase'

const MissionBoardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)

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

      // Show all missions to all users:
      // - Pending missions (available for anyone to accept)
      // - Accepted missions (show as in progress for the accepter, available for others to see but not accept)
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

    // Subscribe to real-time changes
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
          fetchMissions() // Refetch missions when changes occur
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const handleAccept = async (missionId: string) => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
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
      // The real-time subscription will automatically update the UI
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
      // The real-time subscription will automatically update the UI
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
      
      // First, verify the mission exists and belongs to the user
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

      // Optimistically remove from UI first
      setMissions(prevMissions => prevMissions.filter(mission => mission.id !== missionId))

      // Delete from database with explicit conditions
      const { data: deletedData, error: deleteError } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId)
        .eq('user_id', user.id)
        .select()

      if (deleteError) {
        console.error('Error deleting mission from database:', deleteError)
        alert('Failed to delete mission. Please try again.')
        // Revert the optimistic update by refetching
        await fetchMissions()
        return
      }

      if (!deletedData || deletedData.length === 0) {
        console.error('No mission was deleted - mission may not exist or user lacks permission')
        alert('Failed to delete mission. You may not have permission to delete this mission.')
        // Revert the optimistic update by refetching
        await fetchMissions()
        return
      }

      console.log(`Successfully deleted mission ${missionId}:`, deletedData)
      
      // Force a small delay to ensure database transaction is complete
      setTimeout(() => {
        // Double-check by refetching to ensure consistency
        fetchMissions()
      }, 500)

    } catch (error) {
      console.error('Unexpected error deleting mission:', error)
      alert('Failed to delete mission. Please try again.')
      // Revert the optimistic update by refetching
      await fetchMissions()
    }
  }

  const handleAddRequest = () => {
    navigate('/add-mission')
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'not stated'
    
    const today = new Date()
    const due = new Date(dueDate)
    
    // Check if it's today
    if (due.toDateString() === today.toDateString()) {
      return 'TODAY'
    }
    
    // Format as readable date
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Header variant="shop" />
      <div className="flex">
        {/* Main Content Area */}
        <div className="flex-1">
          {/* Mission Cards Grid */}
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

        {/* Right Sidebar */}
        <div className="w-[280px] bg-gradient-to-b from-[#B91C1C] to-[#991B1B] min-h-[calc(100vh-64px)] flex flex-col items-center pt-8">
          {/* Add Request Button */}
          <button
            onClick={handleAddRequest}
            className="bg-white text-[#B91C1C] px-6 py-3 rounded-full flex items-center gap-3 shadow-lg hover:shadow-xl transition-all mb-auto mt-8"
          >
            <div className="w-8 h-8 bg-[#B91C1C] rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">ADD REQUEST</span>
          </button>

          {/* Wooden Sign */}
          <div className="mt-auto mb-12">
            <div className="relative">
              {/* Sign Board */}
              <div className="bg-gradient-to-b from-[#D4A574] to-[#B8935A] px-8 py-6 rounded-lg shadow-2xl border-4 border-[#8B6F47] relative">
                <div className="text-center">
                  <h3 className="text-[#4A3C28] font-black text-xl mb-1">COMPLETE</h3>
                  <h3 className="text-[#4A3C28] font-black text-xl mb-1">MISSION TO</h3>
                  <h3 className="text-[#4A3C28] font-black text-xl mb-2">GET BADGES!</h3>
                </div>
                {/* Wood texture lines */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="h-full w-full bg-gradient-to-b from-transparent via-[#8B6F47] to-transparent" style={{ backgroundSize: '100% 4px', backgroundRepeat: 'repeat-y' }}></div>
                </div>
              </div>
              {/* Wooden Pole */}
              <div className="w-6 h-20 bg-gradient-to-b from-[#8B6F47] to-[#6B5637] mx-auto rounded-b-sm shadow-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MissionBoardPage
