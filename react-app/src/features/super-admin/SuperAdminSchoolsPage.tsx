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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#202833] tracking-tight">School Campus & Regional Branch Manager</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configure partner educational institutions, location hubs, and enrollment allocations
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add School Campus</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {schools.map(s => {
          const actualStudentCount = students.filter(std => std.school === s.name).length || s.studentsCount;

          return (
            <div key={s.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col justify-between hover:border-[#85E510] shadow-sm transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-center text-[#2E7D32]">
                    <SchoolIcon className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {s.status}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-[#202833] text-base mb-1">{s.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-[#64748B] mb-4">
                  <MapPin className="w-3.5 h-3.5 text-[#85E510]" />
                  <span>{s.location}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Enrollment:</span>
                <span className="font-mono font-bold text-[#202833]">{actualStudentCount.toLocaleString()} Students</span>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-[#64748B] hover:text-[#202833]">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-heading font-bold text-[#202833] mb-1">Register New School Campus</h3>
            <p className="text-xs text-[#64748B] mb-4">Add partner educational institution to StudentBridge fleet</p>

            <form onSubmit={handleAddSchool} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#64748B] uppercase font-bold mb-1">Campus Name</label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g. Adika Youth Campus B"
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#202833] focus:outline-none focus:border-[#85E510]"
                />
              </div>

              <div>
                <label className="block text-[#64748B] uppercase font-bold mb-1">Region / Location Hub</label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#202833] focus:outline-none focus:border-[#85E510]"
                >
                  <option value="Addis Ababa">Addis Ababa</option>
                  <option value="Adama">Adama</option>
                  <option value="Harar">Harar</option>
                  <option value="Hawassa">Hawassa</option>
                  <option value="Dire Dawa">Dire Dawa</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-xs font-bold text-[#64748B] hover:text-[#202833]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black shadow-sm"
                >
                  Register Campus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
