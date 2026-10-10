import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFamilies, getFamilyTreeByFamily } from '../api/families';
import { motion } from 'framer-motion';
import {
  FaSearch, FaTree, FaHome, FaFileExcel, FaFilePdf,
  FaImage, FaPrint, FaUser, FaExpand, FaCompress,
  FaPlus, FaMinus, FaEye
} from 'react-icons/fa';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import Modal from '../components/Modal';
import Button from '../components/Button';
import TreeChart from '../components/tree/TreeChart';
import MemberProfileModal from '../components/tree/MemberProfileModal';
import { collectParentIds } from '../utils/treeLayout';
import { getSpouseLabel } from '../utils/treeLabels';
import toast from 'react-hot-toast';

const CARD_WIDTH = 192; // w-48
const MAX_CANVAS_SIDE = 16000;

// Without photos the tree is drawn like a page of the printed vanshawali:
// names only, arrows down to the children, the generation number beside each row.
const BOOK = { cardWidth: 92, linkWidth: 14, siblingGap: 10, rootGap: 40 };

const toNepaliDigits = (value) => String(value).replace(/[0-9]/g, (digit) => '०१२३४५६७८९'[digit]);

// The generation number of a row: the one most of its people carry
const generationOfRow = (row) => {
  const counts = {};
  row.forEach((box) => {
    const generation = box.node.generation;
    if (generation) counts[generation] = (counts[generation] || 0) + 1;
  });
  const [generation] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return generation ? toNepaliDigits(generation) : '';
};

const BookName = ({ member, isSpouse, onClick }) => {
  const isPlaceholder = member.isPlaceholder === true;
  return (
    <div
      role={isPlaceholder ? undefined : 'button'}
      onClick={isPlaceholder ? undefined : onClick}
      title={member.memberNumber ? `${member.name} (${member.memberNumber})` : member.name}
      className={`
        book-name w-full px-0.5 text-center text-[13px] leading-5 break-words
        ${isSpouse ? 'text-gray-600' : 'font-semibold text-gray-900'}
        ${isPlaceholder ? 'italic cursor-default' : 'cursor-pointer hover:underline'}
      `}
    >
      {member.name || 'नाम अज्ञात'}
    </div>
  );
};

const TreeMemberCard = ({ member, isSpouse, showPhotos, onClick }) => {
  const [photoFailed, setPhotoFailed] = useState(false);

  const isDeceased = member.isAlive === false;
  const isPlaceholder = member.isPlaceholder === true;
  const genderIcon = member.gender === 'male' ? '👨' : member.gender === 'female' ? '👩' : '👤';
  const relationship = member.lineageRole === 'lineage_head' ? 'घरमुली' : member.relationship || 'सदस्य';
  const spouseLabel = getSpouseLabel(member);

  return (
    <div
      className={`
        h-full bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300
        border-2 ${isDeceased ? 'border-gray-300' : isSpouse ? 'border-pink-300' : 'border-green-300'}
        ${isPlaceholder ? 'border-dashed cursor-default' : 'cursor-pointer'} w-48 hover:border-green-400
        ${isSpouse ? 'bg-pink-50/80' : ''}
      `}
      onClick={isPlaceholder ? undefined : onClick}
    >
      <div className="p-2.5">
        {/* Photo & Info */}
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0">
            <div className={`
              w-12 h-12 rounded-full overflow-hidden border-2
              ${isDeceased ? 'border-gray-300' : isSpouse ? 'border-pink-300' : 'border-green-200'}
              bg-gray-100
            `}>
              {showPhotos && member.photo && !photoFailed ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <div className={`
                  w-full h-full flex items-center justify-center text-xl
                  ${isDeceased ? 'bg-gray-200' : isSpouse ? 'bg-pink-100' : 'bg-gradient-to-br from-green-100 to-emerald-100'}
                `}>
                  {genderIcon}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              {(!isSpouse || relationship !== 'सदस्य') && (
                <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full truncate max-w-[60px]">
                  {relationship}
                </span>
              )}
              {isSpouse && relationship !== spouseLabel && (
                <span className="text-[9px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-full">
                  {spouseLabel}
                </span>
              )}
              {isDeceased && <span className="text-[9px] text-red-500">✝</span>}
            </div>
            <p className="font-semibold text-xs text-gray-800 truncate mt-0.5" title={member.name}>
              {member.name || 'नाम अज्ञात'}
            </p>
            {member.vanshaGenerationNumber && (
              <p className="text-[9px] text-gray-500">वंशज: {member.vanshaGenerationNumber}</p>
            )}
          </div>
        </div>

        {/* Generation */}
        {member.generation && (
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-[9px] text-gray-500">
            पुस्ता: {member.generation}
          </div>
        )}
      </div>
    </div>
  );
};

const FamilyTreePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [profileMemberId, setProfileMemberId] = useState(null);

  const treeRef = useRef(null);

  const { data: familiesData, isLoading: familiesLoading } = useQuery({
    queryKey: ['families'],
    queryFn: () => getFamilies({ limit: 1000 }),
  });

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ['familyTree', selectedFamily?._id],
    queryFn: () => getFamilyTreeByFamily(selectedFamily._id),
    enabled: !!selectedFamily,
  });

  const filteredFamilies = useMemo(() => {
    if (!familiesData?.data) return [];
    if (!searchTerm) return familiesData.data;

    const search = searchTerm.toLowerCase();
    return familiesData.data.filter(family =>
      family.familyName?.toLowerCase().includes(search) ||
      family.familyNumber?.toLowerCase().includes(search) ||
      family.vanshaGenerationNumber?.toLowerCase().includes(search) ||
      family.clan?.toLowerCase().includes(search)
    );
  }, [familiesData, searchTerm]);

  const getFamilyMemberCount = (familyId) =>
    familiesData?.data?.find(family => family._id === familyId)?.memberCount ?? 0;

  const handleFamilyClick = (family) => {
    setSelectedFamily(family);
    setCollapsedNodes(new Set());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFamily(null);
    setProfileMemberId(null);
  };

  const handleMemberClick = (member) => {
    if (member.isPlaceholder) return;
    setProfileMemberId(member._id);
  };

  const toggleNode = (nodeId) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  };

  const toggleAllNodes = () => {
    if (collapsedNodes.size > 0) {
      setCollapsedNodes(new Set());
    } else {
      setCollapsedNodes(new Set(collectParentIds(treeData?.data)));
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setZoomLevel(1);

  const exportToExcel = () => {
    if (!treeData?.data) {
      toast.error('कुनै डाटा छैन');
      return;
    }

    setExporting(true);
    try {
      const toRow = (person, level, parent, spouseOf = '') => ({
        'पुस्ता': person.generation || level + 1,
        'नाम': person.name || '',
        'सम्बन्ध': person.relationship || (spouseOf ? getSpouseLabel(person) : 'सदस्य'),
        'श्रीमान/श्रीमती': spouseOf,
        'वंशज नं.': person.vanshaGenerationNumber || '',
        'परिवार नं.': person.familyNumber || selectedFamily?.familyNumber || '',
        'जन्म मिति': person.dobNepali || (person.dob ? new Date(person.dob).toLocaleDateString('ne-NP') : ''),
        'जीवित': person.isAlive !== false ? 'हो' : 'होइन',
        'लिङ्ग': person.gender === 'male' ? 'पुरुष' : person.gender === 'female' ? 'महिला' : 'अन्य',
        'पूर्वज': parent || '',
      });

      const flattenTree = (nodes, level = 0, parent = '') => {
        let result = [];
        nodes.forEach(node => {
          const spouses = node.spouses || [];
          result.push(toRow(node, level, parent, spouses.map(s => s.name).join(', ')));
          spouses.forEach(spouse => result.push(toRow(spouse, level, '', node.name)));
          if (node.children && node.children.length > 0) {
            result = result.concat(flattenTree(node.children, level + 1, node.name));
          }
        });
        return result;
      };

      const data = flattenTree(treeData.data);
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Family Tree');
      XLSX.writeFile(wb, `Family_Tree_${selectedFamily?.familyName || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel export successful!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const captureTree = async () => {
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:-100000px;top:0;padding:24px;background:#ffffff;';
    const copy = treeRef.current.cloneNode(true);
    copy.querySelectorAll('[data-tree-control]').forEach((control) => control.remove());
    stage.appendChild(copy);
    document.body.appendChild(stage);

    try {
      const longestSide = Math.max(stage.offsetWidth, stage.offsetHeight, 1);
      return await html2canvas(stage, {
        scale: Math.min(2, MAX_CANVAS_SIDE / longestSide),
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
    } finally {
      stage.remove();
    }
  };

  const exportToPDF = async () => {
    if (!treeRef.current) {
      toast.error('Tree not ready');
      return;
    }
    setExporting(true);
    try {
      const canvas = await captureTree();
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px', format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Family_Tree_${selectedFamily?.familyName || 'All'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF export successful!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const exportToImage = async () => {
    if (!treeRef.current) {
      toast.error('Tree not ready');
      return;
    }
    setExporting(true);
    try {
      const canvas = await captureTree();
      const link = document.createElement('a');
      link.download = `Family_Tree_${selectedFamily?.familyName || 'All'}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Image export successful!');
    } catch (error) {
      console.error('Image export error:', error);
      toast.error('Failed to export Image');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = useCallback(() => {
    if (!treeRef.current) {
      toast.error('Tree not ready');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const printable = treeRef.current.cloneNode(true);
    printable.querySelectorAll('[data-tree-control]').forEach((control) => control.remove());
    const familyName = selectedFamily?.familyName || 'Family Tree';

    const appStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => (node.tagName === 'LINK' ? `<link rel="stylesheet" href="${node.href}">` : node.outerHTML))
      .join('\n');

    // A3 landscape minus margins is about 1500px wide at 96dpi
    const fitScale = Math.min(1, 1500 / Math.max(treeRef.current.offsetWidth, 1));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${familyName} - Family Tree</title>
          ${appStyles}
          <style>
            @page { size: A3 landscape; margin: 10mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: white; }
            body, body * { visibility: visible !important; }
            .tree-print-title { text-align: center; font-size: 20px; font-weight: bold; margin: 0 0 20px; color: #333; }
          </style>
        </head>
        <body>
          <div class="tree-print-title">${familyName}</div>
          <div style="zoom: ${fitScale};">
            ${printable.outerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    }, 500);
  }, [selectedFamily]);

  const FamilyCard = ({ family }) => {
    const memberCount = getFamilyMemberCount(family._id);
    const isClosed = family.status === 'closed';

    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.12)' }}
        className={`bg-white rounded-2xl border ${isClosed ? 'border-gray-300' : 'border-green-200'}
          overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer`}
        onClick={() => handleFamilyClick(family)}
      >
        <div className="relative">
          <div className={`h-32 ${isClosed ? 'bg-gray-300' : 'bg-gradient-to-r from-green-400 to-emerald-500'}
            flex items-center justify-center`}>
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
              {family.familyPhoto ? (
                <img src={family.familyPhoto} alt={family.familyName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <FaHome className={`text-white text-3xl ${isClosed ? 'opacity-50' : ''}`} />
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 pb-4 px-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-800 truncate">
                {family.familyName || 'Unnamed Family'}
              </h3>
              <p className="text-sm text-gray-500">
                घर नं. {family.house?.houseNumber || 'N/A'} • परिवार नं. {family.familyNumber}
              </p>
              {family.vanshaGenerationNumber && (
                <p className="text-xs text-gray-400 mt-0.5">
                  वंशज नं.: {family.vanshaGenerationNumber}
                </p>
              )}
            </div>
            {isClosed && (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-medium">
                बन्द
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <FaUser className={`${isClosed ? 'text-gray-400' : 'text-blue-500'} text-sm`} />
              <span className="text-sm font-medium text-gray-700">{memberCount} सदस्य</span>
            </div>
            {family.totalGenerations > 0 && (
              <div className="flex items-center gap-1.5">
                <FaTree className={`${isClosed ? 'text-gray-400' : 'text-green-500'} text-sm`} />
                <span className="text-sm font-medium text-gray-700">{family.totalGenerations} पुस्ता</span>
              </div>
            )}
          </div>

          <div className="mt-3">
            <span className={`text-xs font-medium flex items-center gap-1 ${isClosed ? 'text-gray-400' : 'text-green-600'}`}>
              <FaTree className="text-xs" />
              वृक्ष हेर्नुहोस्
            </span>
          </div>
        </div>
      </motion.div>
    );
  };


  if (familiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FaTree className="text-green-500" />
          पारिवारिक वृक्ष
        </h1>
        <p className="text-gray-600">परिवारको वृक्ष हेर्नुहोस् र डाउनलोड गर्नुहोस्</p>
      </div>


      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="परिवार खोज्नुहोस्..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>


      {filteredFamilies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FaHome className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">कुनै परिवार फेला परेन</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFamilies.map((family) => (
            <FamilyCard key={family._id} family={family} />
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={profileMemberId ? () => setProfileMemberId(null) : handleCloseModal}
        title={selectedFamily?.familyName || 'पारिवारिक वृक्ष'}
        size="xl"
      >
        {selectedFamily && (
          <div className="space-y-4">

            <div className="no-print flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl">

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportToExcel} disabled={exporting}>
                  <FaFileExcel className="mr-1.5 text-green-600" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={exporting}>
                  <FaFilePdf className="mr-1.5 text-red-600" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportToImage} disabled={exporting}>
                  <FaImage className="mr-1.5 text-blue-600" />
                  Image
                </Button>
                <Button variant="primary" size="sm" onClick={handlePrint}>
                  <FaPrint className="mr-1.5" />
                  Print
                </Button>
              </div>


              <div className="h-6 w-px bg-gray-300" />


              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPhotos}
                  onChange={(e) => setShowPhotos(e.target.checked)}
                  className="h-4 w-4 text-green-600 rounded"
                />
                <span className="text-xs text-gray-700" title="टिक हटाउँदा वंशावली पुस्तकको ढाँचामा देखिन्छ">फोटो</span>
              </label>


              <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
                <button onClick={handleZoomOut} className="p-1 hover:bg-gray-100 rounded">
                  <FaMinus className="h-3 w-3 text-gray-600" />
                </button>
                <span className="text-xs text-gray-600 min-w-[40px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button onClick={handleZoomIn} className="p-1 hover:bg-gray-100 rounded">
                  <FaPlus className="h-3 w-3 text-gray-600" />
                </button>
                <button onClick={handleResetZoom} className="p-1 hover:bg-gray-100 rounded ml-1">
                  <FaExpand className="h-3 w-3 text-gray-600" />
                </button>
              </div>


              <button
                onClick={toggleAllNodes}
                className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                {collapsedNodes.size > 0 ? (
                  <><FaExpand className="text-xs" /> सबै विस्तार</>
                ) : (
                  <><FaCompress className="text-xs" /> सबै संकुचित</>
                )}
              </button>
            </div>


            <div
              className="min-h-[400px] max-h-[calc(70vh-5.5rem)] overflow-auto bg-white rounded-xl p-4 border border-gray-200"
            >
              {treeLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : treeData?.data && treeData.data.length > 0 ? (
                <div className="w-max min-w-full p-4" style={{ zoom: zoomLevel }}>
                  {showPhotos ? (
                    <TreeChart
                      ref={treeRef}
                      className="mx-auto"
                      roots={treeData.data}
                      cardWidth={CARD_WIDTH}
                      collapsedIds={collapsedNodes}
                      onToggle={toggleNode}
                      renderCard={(member, { isSpouse }) => (
                        <TreeMemberCard
                          member={member}
                          isSpouse={isSpouse}
                          showPhotos={showPhotos}
                          onClick={() => handleMemberClick(member)}
                        />
                      )}
                    />
                  ) : (
                    <TreeChart
                      ref={treeRef}
                      className="mx-auto"
                      variant="book"
                      roots={treeData.data}
                      {...BOOK}
                      rowLabel={generationOfRow}
                      collapsedIds={collapsedNodes}
                      onToggle={toggleNode}
                      renderCard={(member, { isSpouse }) => (
                        <BookName
                          member={member}
                          isSpouse={isSpouse}
                          onClick={() => handleMemberClick(member)}
                        />
                      )}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaTree className="text-4xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">कुनै वृक्ष डाटा उपलब्ध छैन</p>
                  <p className="text-sm text-gray-400">वृक्ष निर्माण गर्न सदस्यहरू थप्नुहोस्</p>
                </div>
              )}
            </div>

            <MemberProfileModal memberId={profileMemberId} onClose={() => setProfileMemberId(null)} />
          </div>
        )}
      </Modal>


      <style>{`
        @media print {
          .no-print,
          header, nav, .sidebar, .toolbar,
          button, .modal-controls, .export-buttons,
          .family-info-bar, .controls-bar {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .tree-print-title,
          .tree-print-title *,
          .tree-content,
          .tree-content * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
};

export default FamilyTreePage;