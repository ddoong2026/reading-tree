import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Instances, Instance, Html, useProgress } from '@react-three/drei';
import { Link, useParams } from 'react-router-dom';
import * as THREE from 'three';

import { TreeModel } from './world3d/TreeModel';
import { CharacterModel } from './world3d/CharacterModel';
import { PlantModel } from './world3d/PlantModel';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// 완전한 단색(흰색) 구름 컴포넌트
const SimpleCloud = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[3, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
    <mesh position={[2.5, -0.5, 0]}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
    <mesh position={[-2.5, -0.5, 0]}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial color="white" />
    </mesh>
  </group>
);

// --- 로딩 화면 컴포넌트 ---
const CanvasLoader = () => {
  const { progress } = useProgress();
  return (
    <Html center zIndexRange={[1000, 0]}>
      <div className="flex flex-col items-center justify-center p-8 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl min-w-[280px]">
        <div className="text-5xl mb-4 animate-bounce">🌳</div>
        <h2 className="text-2xl font-bold text-green-800 mb-4">학급 나무로 이동 중...</h2>
        <div className="w-full bg-green-100 rounded-full h-4 mb-2 overflow-hidden border border-green-200">
          <div 
            className="bg-gradient-to-r from-green-400 to-emerald-500 h-full transition-all duration-300 ease-out" 
            style={{ width: `${Math.max(5, progress)}%` }}
          ></div>
        </div>
        <p className="text-md font-bold text-green-600">{progress.toFixed(0)}% 완료</p>
      </div>
    </Html>
  );
};

const GameWorld: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const { profile } = useAuth();
  const [characterTarget, setCharacterTarget] = useState<THREE.Vector3 | null>(null);
  const [controlMode, setControlMode] = useState<'click' | 'keyboard'>('click');
  
  const formatClassId = (cid: string | null | undefined) => {
    if (!cid) return '전체';
    const parts = cid.split('-');
    if (parts.length === 3) {
      return `${parts[0]}학년도 ${parts[1]}학년 ${parts[2]}반`;
    }
    if (cid === 'class-1') return '새싹 1반';
    if (cid === 'class-2') return '햇살 2반';
    if (cid === 'class-3') return '푸른 3반';
    return cid;
  };
  
  const dashboardPath = (profile?.role === 'teacher' || profile?.role === 'admin') ? '/teacher' : '/student';
  
  // 나무 레벨업 테스트용 상태
  const initialLevel = classId === 'class-3' ? 1 : 3;
  const [treeLevel] = useState(initialLevel);

  const [studentsPlants, setStudentsPlants] = useState<{ id: string, name: string, growth: number, isFlower: boolean, position: [number, number, number] }[]>([]);

  // 심기 모드 관련 상태
  const [isPlantingMode, setIsPlantingMode] = useState(false);
  const [plantPreviewPos, setPlantPreviewPos] = useState<THREE.Vector3 | null>(null);
  const [plantPreviewValid, setPlantPreviewValid] = useState(false);

  // 식물 상호작용 상태
  const [hoveredPlantId, setHoveredPlantId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const [myInventory, setMyInventory] = useState<{ water: number; sun: number; wind: number; plantGrowth: number; plantPosX: number | null }>({ water: 0, sun: 0, wind: 0, plantGrowth: 0, plantPosX: null });

  React.useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudentLogs([]);
      return;
    }
    const fetchLogs = async () => {
      setIsLogsLoading(true);
      const { data } = await supabase.from('reading_logs').select('*').eq('user_id', selectedStudentId).order('created_at', { ascending: false });
      setSelectedStudentLogs(data || []);
      setIsLogsLoading(false);
    };
    fetchLogs();
  }, [selectedStudentId]);

  React.useEffect(() => {
    const fetchPlants = async () => {
      // 1. Fetch all users for the current class
      let userQuery = supabase.from('users').select('id, name, plant_growth, class_id, plant_position_x, plant_position_z, item_water, item_sun, item_wind');
      if (classId) {
        userQuery = userQuery.eq('class_id', classId);
      }
      let { data: usersData } = await userQuery;

      // 1-b. 항상 현재 로그인한 유저의 정보를 가져와서 병합 (교사나 반이 없는 유저가 숲에 왔을 때 인벤토리/심기 권한을 주기 위함)
      if (profile?.id) {
        const { data: meData } = await supabase.from('users').select('id, name, plant_growth, class_id, plant_position_x, plant_position_z, item_water, item_sun, item_wind').eq('id', profile.id).single();
        if (meData) {
          if (!usersData) usersData = [];
          if (!usersData.some(u => u.id === meData.id)) {
            usersData.push(meData);
          }
        }
      }

      // 2. Fetch all reading logs
      const { data: logsData } = await supabase.from('reading_logs').select('user_id, category');
      
      if (usersData && logsData) {
        const me = usersData.find(u => u.id === profile?.id);
        if (me) {
          setMyInventory({ 
            water: me.item_water || 0, 
            sun: me.item_sun || 0, 
            wind: me.item_wind || 0,
            plantGrowth: me.plant_growth || 0,
            plantPosX: me.plant_position_x
          });
        }

        // filter out users without logs or growth
        const activeUsers = usersData.filter(user => 
          (user.plant_growth && user.plant_growth > 0) || 
          logsData.some(log => log.user_id === user.id)
        );

        const plants = activeUsers.map((user) => {
          const userLogs = logsData.filter(log => log.user_id === user.id);
          const uniqueCategories = new Set(userLogs.map(log => log.category || '000'));
          const isFlower = uniqueCategories.size >= 10;

          if (user.plant_position_x == null || user.plant_position_z == null) {
            return null; // 아직 심지 않음
          }
          
          return {
            id: user.id,
            name: user.name,
            growth: user.plant_growth || 0,
            isFlower,
            position: [user.plant_position_x, 0, user.plant_position_z] as [number, number, number]
          };
        }).filter(Boolean) as typeof studentsPlants;
        setStudentsPlants(plants);
      }
    };
    fetchPlants();
  }, [classId, profile?.id]);

  // 바닥(땅) 클릭 핸들러
  const handleGroundClick = (event: ThreeEvent<PointerEvent>) => {
    if (isPlantingMode) {
      const pt = event.point.clone();
      setPlantPreviewPos(pt);
      
      const distToTree = Math.sqrt(pt.x * pt.x + pt.z * pt.z);
      let isValid = distToTree >= 3.0; // 나무 반경 3.0 이내 불가
      
      if (isValid) {
        for (const p of studentsPlants) {
          const dx = pt.x - p.position[0];
          const dz = pt.z - p.position[2];
          if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
            isValid = false;
            break;
          }
        }
      }
      setPlantPreviewValid(isValid);
      return;
    }

    if (controlMode === 'keyboard') return; // 키보드 모드일 때는 클릭 이동 무시
    setCharacterTarget(event.point.clone());
  };

  const handleConfirmPlant = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plantPreviewPos || !profile?.id) return;
    
    const { data, error } = await supabase.from('users').update({
      plant_position_x: plantPreviewPos.x,
      plant_position_z: plantPreviewPos.z,
      class_id: classId || null
    }).eq('id', profile.id).select();

    if (error || !data || data.length === 0) {
      alert("⚠️ 씨앗 심기에 실패했습니다! (DB 권한 부족: Supabase UPDATE 정책을 확인하세요)");
      setIsPlantingMode(false);
      setPlantPreviewPos(null);
      return;
    }
    
    setIsPlantingMode(false);
    setPlantPreviewPos(null);
    alert("씨앗을 심었습니다! 이제 물을 주고 식물을 키워보세요.");
    window.location.reload();
  };



  const grassData = React.useMemo(() => {
    const data: { position: [number, number, number], scaleY: number }[] = [];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 35;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scaleY = 0.5 + Math.random() * 1.5;
      
      data.push({ position: [x, scaleY / 2, z], scaleY });
    }
    return data;
  }, []);

  // 실제 씨앗 보유 여부 (상태에서 즉시 도출)
  const actualHasSeed = myInventory.plantGrowth > 0 && myInventory.plantPosX == null;

  return (
    <div className="relative w-full h-screen bg-sky-200 overflow-hidden">
      {/* 3D 캔버스 영역 (해상도 타협 및 자동 성능 조절로 초저사양 기기 완벽 최적화) */}
      <Canvas 
        shadows 
        dpr={[0.8, 1]} 
        performance={{ min: 0.5 }} 
        camera={{ position: [0, 8, 18], fov: 45 }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <ambientLight intensity={0.6} />
          <directionalLight 
            castShadow 
            position={[10, 20, 10]} 
            intensity={1.2} 
            shadow-mapSize={[512, 512]} 
          />
          
          <color attach="background" args={['#87CEEB']} />
          <SimpleCloud position={[-15, 20, -25]} scale={2} />
          <SimpleCloud position={[20, 25, -30]} scale={3} />

          {/* 에셋 렌더링 */}
          <CharacterModel targetPosition={characterTarget} controlMode={controlMode} />
          
          {studentsPlants.map(plant => (
            <group 
              key={plant.id} 
              position={plant.position}
              onPointerOver={(e) => { e.stopPropagation(); setHoveredPlantId(plant.id); document.body.style.cursor = 'pointer'; }}
              onPointerOut={(e) => { e.stopPropagation(); setHoveredPlantId(null); document.body.style.cursor = 'auto'; }}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (!isPlantingMode) setSelectedStudentId(plant.id); 
              }}
            >
              <PlantModel growth={plant.growth} isFlower={plant.isFlower} />
              {!isPlantingMode && hoveredPlantId === plant.id && (
                <Html position={[0, 2, 0]} center zIndexRange={[100, 0]}>
                  <div className="px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border-2 border-green-300 text-sm font-bold text-green-800 whitespace-nowrap cursor-pointer animate-fade-in transition-transform hover:scale-110">
                    🌱 {plant.name}의 식물 구경하기
                  </div>
                </Html>
              )}
            </group>
          ))}
          
          {isPlantingMode && plantPreviewPos && (
            <group position={plantPreviewPos}>
               <mesh position={[0, 0.1, 0]}>
                   <sphereGeometry args={[0.2, 16, 16]} />
                   <meshStandardMaterial color={plantPreviewValid ? "#4ade80" : "#ef4444"} transparent opacity={0.7} />
               </mesh>
               <Html position={[0, 1, 0]} center zIndexRange={[100, 0]}>
                  <div className="flex flex-col items-center gap-2">
                    {!plantPreviewValid ? (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-bold shadow whitespace-nowrap">
                        여기에 심을 수 없습니다 (너무 가깝습니다)
                      </span>
                    ) : (
                      <button 
                        onPointerDown={handleConfirmPlant}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold shadow-lg whitespace-nowrap animate-bounce pointer-events-auto"
                      >
                        씨앗 심기 🌱
                      </button>
                    )}
                  </div>
               </Html>
            </group>
          )}
          
          <Instances limit={50} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[0.2, 1, 0.2]} />
            <meshStandardMaterial color="#66b032" />
            {grassData.map((data, i) => (
              <Instance key={i} position={data.position} scale={[1, data.scaleY, 1]} />
            ))}
          </Instances>

          <TreeModel position={[0, 0, 0]} level={treeLevel} dashboardPath={dashboardPath} />

          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, 0, 0]} 
            receiveShadow 
            onClick={handleGroundClick}
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color="#a8d94e" roughness={0.8} />
          </mesh>

          <ContactShadows position={[0, -0.05, 0]} opacity={0.5} scale={40} blur={1} far={10} resolution={128} />
          
          {/* 키보드 모드일 때는 마우스 회전(OrbitControls)을 끄고 카메라를 고정시킵니다 */}
          <OrbitControls 
            makeDefault 
            enabled={controlMode === 'click'}
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2} 
            minDistance={5} 
            maxDistance={150} 
          />
        </Suspense>
      </Canvas>

      {/* 게임 월드 위에 띄워질 UI 오버레이 (2D HTML) */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/map" 
            className="px-6 py-2 bg-white/90 backdrop-blur-sm text-gray-800 font-bold rounded-full shadow-md hover:bg-white transition-all flex items-center"
          >
            ← 숲(월드맵)으로
          </Link>
          <div className="px-6 py-2 bg-green-600 text-white font-black rounded-full shadow-lg border-2 border-green-400 text-lg">
            {formatClassId(classId)}의 독서 나무
          </div>
        </div>
        
        {/* 조작 모드 전환 버튼 */}
        <button
          onClick={() => setControlMode(prev => prev === 'click' ? 'keyboard' : 'click')}
          className="px-6 py-3 w-fit bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-2xl shadow-lg border-2 border-indigo-300 transition-all flex items-center gap-2"
        >
          {controlMode === 'click' ? '🎮 1인칭(키보드) 모드로 변경' : '🖱️ 3인칭(마우스) 모드로 변경'}
        </button>

        {/* 씨앗 심기 수동 트리거 */}
        {actualHasSeed && !isPlantingMode && (
          <button
            onClick={() => setIsPlantingMode(true)}
            className="px-6 py-3 w-fit bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg border-2 border-emerald-300 transition-all flex items-center gap-2 mt-2 animate-bounce"
          >
            🌱 보유 씨앗 1개 (심기)
          </button>
        )}

        {/* 씨앗 심기 취소 버튼 */}
        {isPlantingMode && (
          <button
            onClick={() => { setIsPlantingMode(false); setPlantPreviewPos(null); }}
            className="px-6 py-3 w-fit bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-2xl shadow-lg border-2 border-gray-300 transition-all flex items-center gap-2 mt-2"
          >
            ❌ 씨앗 심기 취소
          </button>
        )}

        {/* 내 인벤토리 표시 */}
        <div className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border-2 border-green-200 mt-2 w-fit">
          <h3 className="text-sm font-bold text-green-800">내 인벤토리</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-1 font-bold text-amber-600">
              <img src="/seed.png" alt="씨앗" className="w-6 h-6 object-contain drop-shadow-sm" /> 
              <span className="text-xs">{actualHasSeed ? '1개 (미심음)' : (myInventory.plantGrowth > 0 ? '이미 심음' : '0개')}</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-blue-600">
              <img src="/water.png" alt="물" className="w-6 h-6 object-contain drop-shadow-sm" /> 
              <span>x {myInventory.water}</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-red-600">
              <img src="/sun.png" alt="햇빛" className="w-6 h-6 object-contain drop-shadow-sm" /> 
              <span>x {myInventory.sun}</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-teal-600">
              <img src="/wind.png" alt="바람" className="w-6 h-6 object-contain drop-shadow-sm" /> 
              <span>x {myInventory.wind}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-medium leading-tight">아이템 사용은 '내 대시보드'에서 할 수 있습니다.</p>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-4">
        {profile?.role === 'teacher' && (
          <Link 
            to="/student" 
            className="px-6 py-2 bg-green-500 text-white font-bold rounded-full shadow-md hover:bg-green-600 transition-all flex items-center gap-2"
          >
            🌱 내 상점 가기
          </Link>
        )}
        <Link 
          to={dashboardPath} 
          className="px-6 py-2 bg-blue-500 text-white font-bold rounded-full shadow-md hover:bg-blue-600 transition-all"
        >
          {profile?.role === 'teacher' || profile?.role === 'admin' ? '교사 대시보드' : '내 대시보드'}
        </Link>
        <Link 
          to="/write" 
          className="px-6 py-2 bg-amber-500 text-white font-bold rounded-full shadow-md hover:bg-amber-600 transition-all flex items-center gap-2"
        >
          <span>✍️</span> 독서록 쓰기
        </Link>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white px-8 py-3 rounded-full backdrop-blur-sm pointer-events-none text-base font-medium shadow-lg whitespace-nowrap">
        {isPlantingMode 
          ? '🌱 심기 모드: 마우스로 땅을 클릭하여 씨앗을 심을 위치를 정해주세요.' 
          : controlMode === 'click' 
            ? '👆 마우스로 땅을 클릭하여 이동하고, 친구의 식물을 클릭하여 독서록을 구경해보세요!'
            : '⌨️ W,A,S,D(이동) / Shift(달리기) / Space(점프) - 마우스로 식물 클릭 가능'}
      </div>

      {/* 독서록 구경하기 모달 */}
      {selectedStudentId && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-green-50">
              <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                <span>🌱</span> 
                {studentsPlants.find(p => p.id === selectedStudentId)?.name} 친구의 독서 기록
              </h2>
              <button 
                onClick={() => setSelectedStudentId(null)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors shadow-sm font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {isLogsLoading ? (
                <div className="flex justify-center items-center h-full text-gray-500 font-medium">독서록을 불러오는 중...</div>
              ) : selectedStudentLogs.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500 italic">아직 작성한 독서록이 없어요.</div>
              ) : (
                <div className="space-y-6">
                  {selectedStudentLogs.map(log => (
                    <div key={log.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-800">{log.book_title}</h3>
                        <span className="text-sm text-gray-500">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {log.image_url && (
                        <img src={log.image_url} alt="책 이미지" className="w-full max-w-sm rounded-xl mb-4 shadow-sm border border-gray-100" />
                      )}
                      
                      {log.text_content && (
                        <div className="bg-gray-50 p-4 rounded-xl text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                          {log.text_content}
                        </div>
                      )}
                      
                      {log.ai_feedback && (
                        <div className="mt-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                          <h4 className="text-sm font-bold text-purple-800 mb-2">AI 멘토의 피드백 ✨</h4>
                          <p className="text-purple-700 text-sm whitespace-pre-wrap">{log.ai_feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameWorld;
