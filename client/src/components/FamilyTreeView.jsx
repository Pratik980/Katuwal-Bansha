import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaUser, FaTree, FaUsers } from 'react-icons/fa';
import { getFamilyTreeByFamily } from '../api/families';
import TreeChart from './tree/TreeChart';
import { getRelationLabel, getBirthDateLabel, getBsDateLabel } from '../utils/treeLabels';

const CARD_WIDTH = 176; // w-44

const MemberCard = ({ member, isSpouse, showPhotos, onClick }) => {
  const [photoFailed, setPhotoFailed] = useState(false);

  const isDeceased = member.isAlive === false;
  const isPlaceholder = member.isPlaceholder === true;
  const hasPhoto = typeof member.photo === 'string' && member.photo.trim() !== '';
  const shouldShowPhoto = showPhotos && hasPhoto && !photoFailed;
  const birthDate = getBirthDateLabel(member);

  return (
    <div
      className={`h-full bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 w-44 ${isPlaceholder ? 'border-dashed cursor-default' : 'cursor-pointer'} ${isDeceased ? 'border-gray-300' : isSpouse ? 'border-pink-300' : 'border-green-300'} hover:border-green-400 ${isSpouse ? 'bg-pink-50/60' : ''}`}
      onClick={isPlaceholder ? undefined : onClick}
    >
      <div className="relative">
        {shouldShowPhoto ? (
          <img src={member.photo} alt={member.name} className="w-full h-28 object-cover rounded-t-xl" onError={() => setPhotoFailed(true)} />
        ) : (
          <div className={`flex w-full h-28 items-center justify-center rounded-t-xl ${isDeceased ? 'bg-gray-200' : isSpouse ? 'bg-pink-100' : 'bg-gradient-to-br from-green-100 to-emerald-100'}`}>
            <div className="text-center">
              <FaUser className={`text-4xl ${isDeceased ? 'text-gray-400' : isSpouse ? 'text-pink-300' : 'text-green-400'} mx-auto`} />
              <span className="text-[10px] text-gray-500 mt-1 block">फोटो छैन</span>
            </div>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shadow-sm ${isSpouse ? 'bg-pink-500/90 text-white' : 'bg-white/90 text-gray-700'}`}>{getRelationLabel(member)}</span>
        </div>
        {isDeceased && <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">✝ मृत</span>}
        {member.personStatus === 'missing' && <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">हराएको</span>}
      </div>
      <div className="p-2.5 space-y-0.5">
        <p className="font-semibold text-xs text-gray-800 truncate" title={member.name}>{member.name || 'नाम अज्ञात'}</p>
        {member.surname && <p className="text-[9px] text-gray-500 truncate">{member.surname}</p>}
        {member.vanshaGenerationNumber && <p className="text-[9px] text-gray-600">वंश: {member.vanshaGenerationNumber}</p>}
        {member.familyNumber && <p className="text-[9px] text-gray-600">परिवार: {member.familyNumber}</p>}
        {member.memberNumber && <p className="text-[9px] font-mono text-green-600">ID: {member.memberNumber}</p>}
        {birthDate && <p className="text-[8px] text-gray-400">जन्म: {birthDate}</p>}
        {isDeceased && member.dod && <p className="text-[8px] text-red-400">मृत्यु: {getBsDateLabel(member, 'dod')}</p>}
        {isPlaceholder && <p className="text-[8px] text-gray-400">सदस्य विवरण थपिएको छैन</p>}
      </div>
    </div>
  );
};

const FamilyTreeView = ({
  familyId,
  onMemberClick,
  showPhotos = true,
}) => {
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['familyTree', familyId],
    queryFn: () => getFamilyTreeByFamily(familyId),
    enabled: !!familyId,
  });

  const toggleNode = useCallback((nodeId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const roots = treeData?.data || [];
  const total = treeData?.count || 0;

  if (total === 0) {
    return (
      <div className="text-center py-12">
        <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">यस परिवारमा कुनै सदस्य छैनन्</p>
        <p className="text-sm text-gray-400">पारिवारिक वृक्ष निर्माण गर्न सदस्यहरू थप्नुहोस्</p>
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <div className="text-center py-12">
        <FaTree className="text-4xl text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">पारिवारिक वृक्ष संरचना फेला परेन</p>
        <p className="text-sm text-gray-400">पारिवारिक वृक्ष निर्माण गर्न सम्बन्धहरू थप्नुहोस्</p>
      </div>
    );
  }

  return (
    <div className="w-full max-h-[68vh] overflow-auto">
      <div className="text-sm text-gray-500 mb-4 text-center sticky left-0">
        <span className="bg-gray-100 px-3 py-1 rounded-full">कुल {total} सदस्यहरू</span>
      </div>
      <div className="w-max min-w-full p-6 min-h-[400px]">
        <TreeChart
          className="mx-auto"
          roots={roots}
          cardWidth={CARD_WIDTH}
          collapsedIds={collapsedIds}
          onToggle={toggleNode}
          renderCard={(member, { isSpouse }) => (
            <MemberCard
              member={member}
              isSpouse={isSpouse}
              showPhotos={showPhotos}
              onClick={() => onMemberClick?.(member)}
            />
          )}
        />
      </div>
    </div>
  );
};

export default FamilyTreeView;
