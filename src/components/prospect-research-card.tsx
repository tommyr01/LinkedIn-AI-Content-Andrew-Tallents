"use client"

import { useState } from "react"
import { X, ExternalLink, UserPlus, Clock, Building, MapPin, Users, TrendingUp, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { ProspectProfile } from "../lib/icp-scorer"

interface ProspectResearchCardProps {
  prospect: ProspectProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToConnections?: (prospect: ProspectProfile) => void
}

export function ProspectResearchCard({ 
  prospect, 
  open, 
  onOpenChange, 
  onAddToConnections 
}: ProspectResearchCardProps) {
  const [isAddingToConnections, setIsAddingToConnections] = useState(false)

  if (!prospect) return null

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Hot Lead': return 'bg-red-500 text-white'
      case 'Warm Lead': return 'bg-orange-500 text-white'
      case 'Cold Lead': return 'bg-blue-500 text-white'
      case 'Not ICP': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    if (score >= 40) return 'text-blue-600'
    return 'text-gray-600'
  }

  const handleAddToConnections = async () => {
    if (!onAddToConnections) {
      toast.error('Connection management not available')
      return
    }

    setIsAddingToConnections(true)
    try {
      await onAddToConnections(prospect)
      toast.success(`Added ${prospect.name} to connections`)
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding to connections:', error)
      toast.error(`Failed to add to connections: ${error.message}`)
    } finally {
      setIsAddingToConnections(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Prospect Research</span>
            <Badge className={getCategoryColor(prospect.icpScore.category)}>
              {prospect.icpScore.category}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            LinkedIn profile analysis and ICP scoring results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prospect Overview */}
          <div className="flex items-start space-x-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-lg font-medium shrink-0 overflow-hidden">
              {prospect.profilePicture ? (
                <img
                  src={prospect.profilePicture}
                  alt={prospect.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span>{prospect.name.split(' ').map(n => n[0]).join('')}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold">{prospect.name}</h3>
              <p className="text-muted-foreground">{prospect.headline}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Building className="h-4 w-4" />
                  <span>{prospect.company}</span>
                </div>
                {prospect.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{prospect.location}</span>
                  </div>
                )}
                {prospect.tenure && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{prospect.tenure} in role</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* ICP Score */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">ICP Score</h4>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(prospect.icpScore.totalScore)}`}>
                  {prospect.icpScore.totalScore}/100
                </div>
                <div className="text-sm text-muted-foreground">
                  {prospect.icpScore.category}
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  prospect.icpScore.totalScore >= 80 ? 'bg-red-500' :
                  prospect.icpScore.totalScore >= 60 ? 'bg-orange-500' :
                  prospect.icpScore.totalScore >= 40 ? 'bg-blue-500' : 'bg-gray-500'
                }`}
                style={{ width: `${prospect.icpScore.totalScore}%` }}
              ></div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Role Match:</span>
                  <span className="font-medium">{prospect.icpScore.breakdown.roleMatch}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Company Size:</span>
                  <span className="font-medium">{prospect.icpScore.breakdown.companySize}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Industry:</span>
                  <span className="font-medium">{prospect.icpScore.breakdown.industry}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Tenure:</span>
                  <span className="font-medium">{prospect.icpScore.breakdown.tenure}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Career Transition:</span>
                  <span className="font-medium">{prospect.icpScore.breakdown.careerTransition}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Leadership:</span>
                  <span className="font-medium">{prospect.icpScore.breakdown.leadership}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Engagement:</span>
                  <span className="font-medium">{prospect.icpScore.breakdown.engagement}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {prospect.icpScore.tags.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Profile Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {prospect.icpScore.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reasoning */}
          {prospect.icpScore.reasoning.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Key Insights</h4>
                <ul className="space-y-1 text-sm">
                  {prospect.icpScore.reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Star className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* LinkedIn Stats */}
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {prospect.followerCount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {prospect.connectionCount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Connections</div>
            </div>
          </div>

          {/* Actions */}
          <Separator />
          <div className="flex items-center justify-between space-x-2">
            <Button
              variant="outline"
              onClick={() => window.open(prospect.profileUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View LinkedIn Profile
            </Button>

            {onAddToConnections && (
              <Button
                onClick={handleAddToConnections}
                disabled={isAddingToConnections}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isAddingToConnections ? 'Adding...' : 'Add to Connections'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}