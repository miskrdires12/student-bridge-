import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Plus, MapPin, School as SchoolIcon, Users, X, Building2 } from 'lucide-react';
import { getSchools, addSchool, getStudents } from '@/lib/store';
import { School } from '@/types';
import { PageShell, PageHero, FactGrid, FactCard, SectionCard, PrimaryButton, ToolbarButton } from '@/components/ui/PageKit';
import { useRegistryVersion } from '@/lib/useRegistryVersion';

export const SuperAdminSchoolsPage: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const registryVersion = useRegistryVersion();
  const [modalOpen, setModalOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newLocation, setNewLocation] = useState('Addis Ababa');

  useEffect(() => {
    setSchools(getSchools());
  }, [registryVersion]);

  const students = useMemo(() => getStudents(), [registryVersion]);
  const totalEnrollment = schools.reduce(
    (acc, s) => acc + (students.filter(std => std.school === s.name).length || s.studentsCount || 0),
    0
  );
  const hubs = new Set(schools.map(s => s.location).filter(Boolean)).size;

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
    <PageShell className="mx-auto max-w-6xl">
      <PageHero
        icon={Building2}
        title="School Campuses"
        count={`${schools.length} campuses`}
        live="Branch manager"
        subtitle="Partner educational institutions, location hubs and enrollment totals for this fleet."
        actions={<PrimaryButton icon={Plus} onClick={() => setModalOpen(true)}>Add School Campus</PrimaryButton>}
      >
        <FactGrid cols={4}>
          <FactCard label="Campuses" value={schools.length.toLocaleString()} hint="registered" icon={SchoolIcon} />
          <FactCard label="Region Hubs" value={hubs.toLocaleString()} hint="locations in use" icon={MapPin} />
          <FactCard label="Enrollment" value={totalEnrollment.toLocaleString()} hint="students counted" icon={Users} />
          <FactCard label="Active" value={schools.filter(s => (s.status || '').toLowerCase() === 'active').length.toLocaleString()} hint="campus status" icon={Layers} />
        </FactGrid>
      </PageHero>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {schools.map(s => {
          const actualStudentCount = students.filter(std => std.school === s.name).length || s.studentsCount;

          return (
            <SectionCard key={s.id} className="transition-colors hover:border-[#85E510]">
              <div className="flex items-start justify-between">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#E3EFD7] bg-[#FBFDF7] text-[#3F7A06]">
                  <SchoolIcon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-[#CDEBB4] bg-[#EAF7DA] px-2 py-0.5 text-[10px] font-bold text-[#2F5E04]">
                  {s.status}
                </span>
              </div>

              <h3 className="mb-1 mt-3 text-base font-black tracking-tight text-[#0B1118]">{s.name}</h3>
              <div className="mb-3 flex items-center gap-1.5 text-xs text-[#7C8B70]">
                <MapPin className="h-3.5 w-3.5 text-[#6FBF0A]" />
                <span>{s.location}</span>
              </div>

              <div className="flex items-center justify-between border-t border-[#EDF4E5] pt-2.5 text-xs">
                <span className="text-[#7C8B70]">Enrollment</span>
                <span className="font-mono font-bold text-[#0B1118]">{actualStudentCount.toLocaleString()} students</span>
              </div>
            </SectionCard>
          );
        })}
        {schools.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#DBEDC9] bg-[#FBFDF7] px-4 py-10 text-center text-xs font-medium text-[#8A9680] md:col-span-2 lg:col-span-4">
            No campus is registered yet. Use Add School Campus to create the first one.
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-[#E3EFD7] bg-white p-6 shadow-2xl">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 cursor-pointer text-[#A6B29B] hover:text-[#0B1118]"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="mb-1 text-lg font-black tracking-tight text-[#0B1118]">Register School Campus</h3>
            <p className="mb-4 text-xs text-[#7C8B70]">Add a partner institution to the campus catalogue.</p>

            <form onSubmit={handleAddSchool} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block font-bold uppercase tracking-wider text-[#7C8B70]">Campus name</label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="e.g. Adika Youth Campus B"
                  className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold uppercase tracking-wider text-[#7C8B70]">Region / location hub</label>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full rounded-xl border border-[#E3E9DD] bg-[#FBFDF7] px-3 py-2 text-[#0B1118] focus:border-[#85E510] focus:outline-none"
                >
                  <option value="Addis Ababa">Addis Ababa</option>
                  <option value="Adama">Adama</option>
                  <option value="Harar">Harar</option>
                  <option value="Hawassa">Hawassa</option>
                  <option value="Dire Dawa">Dire Dawa</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <ToolbarButton onClick={() => setModalOpen(false)} className="border-transparent bg-transparent">
                  Cancel
                </ToolbarButton>
                <PrimaryButton type="submit">Register Campus</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
};
