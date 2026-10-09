import React, { useState, useEffect } from 'react';
import { Layers, Plus, MapPin, School as SchoolIcon, Users, CheckCircle2, X } from 'lucide-react';
import { getSchools, addSchool, getStudents } from '@/lib/store';
import { School } from '@/types';

export const SuperAdminSchoolsPage: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newLocation, setNewLocation] = useState('Addis Ababa');

  useEffect(() => {
    setSchools(getSchools());
  }, []);

  const students = getStudents();

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    const newSc: School = {
      id: `sch_${Date.now()}`,
      name: newSchoolName.trim(),
      location: newLocation.trim(),
      status: 'Active',
      studentsCount: 0,
    };

    addSchool(newSc);
    setSchools([...getSchools()]);
    setModalOpen(false);
    setNewSchoolName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e2c22]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-white tracking-tight">School Campus & Regional Branch Manager</h1>
          <p className="text-xs text-[#9eb2a6] mt-0.5">
            Configure partner educational institutions, location hubs, and enrollment allocations
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8fe617] hover:bg-[#a0f22c] text-[#062404] text-xs font-extrabold shadow-[0_0_20px_rgba(143,230,23,0.3)] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add School Campus</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {schools.map(s => {
          const actualStudentCount = students.filter(std => std.school === s.name).length || s.studentsCount;

          return (
            <div key={s.id} className="bg-[#101612] border border-[#1e2c22] rounded-2xl p-5 flex flex-col justify-between hover:border-[#8fe617]/30 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#8fe617]">
                    <SchoolIcon className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                    {s.status}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-white text-base mb-1">{s.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-[#9eb2a6] mb-4">
                  <MapPin className="w-3.5 h-3.5 text-[#8fe617]" />
                  <span>{s.location}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1e2c22] flex items-center justify-between text-xs">
                <span className="text-[#9eb2a6]">Enrollment:</span>
                <span className="font-mono font-bold text-white">{actualStudentCount.toLocaleString()} Students</span>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101612] border border-[#1e2c22] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-[#9eb2a6] hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-white mb-4">Register New School Branch</h3>

            <form onSubmit={handleAddSchool} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Campus Name</label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g. Cambridge Academy"
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                />
              </div>

              <div>
                <label className="block text-[#9eb2a6] uppercase font-semibold mb-1">Location / City</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g. Addis Ababa"
                  className="w-full bg-[#070908] border border-[#1e2c22] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#8fe617]"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#8fe617] text-[#062404] font-bold text-xs"
                >
                  Save Campus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
