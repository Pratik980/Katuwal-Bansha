// src/components/tree/MemberProfileModal.jsx
// Profile of the member whose tree card was clicked.
import { useQuery } from '@tanstack/react-query';
import { getMemberById } from '../../api/members';
import Modal from '../Modal';
import MemberProfile from '../MemberProfile';

const MemberProfileModal = ({ memberId, onClose }) => {
  const { data: member, isLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: () => getMemberById(memberId),
    enabled: !!memberId,
  });

  return (
    <Modal isOpen={!!memberId} onClose={onClose} title="Member Profile" size="xl">
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        member && <MemberProfile member={member} />
      )}
    </Modal>
  );
};

export default MemberProfileModal;
