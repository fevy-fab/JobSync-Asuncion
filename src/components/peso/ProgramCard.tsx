/**
 * Program Card Component
 *
 * Displays training program information in a card format
 * Similar to announcements card design for consistent UI/UX
 */

import React from 'react';
import { Badge, Button } from '@/components/ui';
import {
  GraduationCap,
  Calendar,
  Users,
  Clock,
  MapPin,
  User,
  Edit,
  Archive,
  Undo2,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  duration: string;
  schedule?: string;
  capacity: number;
  enrolled_count: number;
  location?: string;
  speaker_name?: string;
  start_date: string;
  end_date?: string;
  skills_covered?: string[];
  icon?: string;
  status: 'active' | 'upcoming' | 'archived';
  created_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface ProgramCardProps {
  program: TrainingProgram;
  onView: (program: TrainingProgram) => void;
  onEdit: (program: TrainingProgram) => void;
  onArchive: (program: TrainingProgram) => void;
  onRestore: (program: TrainingProgram) => void;
  onDelete: (program: TrainingProgram) => void;
}

export function ProgramCard({ program, onView, onEdit, onArchive, onRestore, onDelete }: ProgramCardProps) {
  const isArchived = program.status === 'archived';

  // Get status badge configuration
  const getStatusBadge = () => {
    switch (program.status) {
      case 'active':
        return { variant: 'success' as const, icon: CheckCircle2, label: 'Active' };
      case 'upcoming':
        return { variant: 'info' as const, icon: Clock, label: 'Upcoming' };
      case 'archived':
        return { variant: 'secondary' as const, icon: Archive, label: 'Completed' };
      default:
        return { variant: 'secondary' as const, icon: AlertCircle, label: program.status };
    }
  };

  const statusBadge = getStatusBadge();

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div
      onClick={() => onView(program)}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer group"
    >
      {/* Header Image/Icon Section */}
      <div className="relative w-full h-48 bg-gradient-to-br from-[#D4F4DD] to-[#22A555]">
        <div className="absolute inset-0 flex items-center justify-center">
          <GraduationCap className="w-24 h-24 text-white opacity-80" />
        </div>

        {/* Status Badge Overlay */}
        <div className="absolute top-3 right-3">
          <Badge variant={statusBadge.variant} icon={statusBadge.icon} className="shadow-md">
            {statusBadge.label}
          </Badge>
        </div>

        {/* Enrolled Count Badge */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
            <Users className="w-4 h-4 text-[#22A555]" />
            <span className="text-sm font-semibold text-gray-900">
              {program.enrolled_count} / {program.capacity}
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2 group-hover:text-[#22A555] transition-colors">
          {program.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {program.description}
        </p>

        {/* Metadata Section */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          {/* Start Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(program.start_date)}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{program.duration}</span>
          </div>

          {/* Location */}
          {program.location && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{program.location}</span>
            </div>
          )}

          {/* Speaker */}
          {program.speaker_name && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{program.speaker_name}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {/* Non-archived programs: Edit + Archive */}
            {!isArchived && (
              <>
                <Button
                  variant="warning"
                  size="sm"
                  icon={Edit}
                  onClick={(e) => { e.stopPropagation(); onEdit(program); }}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Archive}
                  onClick={(e) => { e.stopPropagation(); onArchive(program); }}
                  className="flex-1"
                >
                  Complete
                </Button>
              </>
            )}

            {/* Archived programs: Restore + Delete */}
            {isArchived && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  icon={Undo2}
                  onClick={(e) => { e.stopPropagation(); onRestore(program); }}
                  className="flex-1"
                >
                  Restore
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={(e) => { e.stopPropagation(); onDelete(program); }}
                  className="flex-1"
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
