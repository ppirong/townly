# Clerk를 이용한 사용자 타입 구분 프로세스

본 문서는 Clerk를 활용하여 시공업체와 시공의뢰자를 구분하고 관리하는 프로세스를 설명합니다.

## 목차
1. [회원가입 프로세스](#1-회원가입-프로세스)
2. [사용자 타입 구분 방식](#2-사용자-타입-구분-방식)
3. [사용자 인터페이스 분기 처리](#3-사용자-인터페이스-분기-처리)
4. [시공업체 등록 프로세스](#4-시공업체-등록-프로세스)
5. [로그인 후 사용자 타입 구분 프로세스](#5-로그인-후-사용자-타입-구분-프로세스)
6. [페이지 접근 제어](#6-페이지-접근-제어)

## 1. 회원가입 프로세스

### 시공업체와 시공의뢰자 회원가입 구분
- **시공의뢰자**: "회원가입" 버튼을 통해 일반 회원으로 가입
  ```tsx
  <SignUpButton mode="modal" forceRedirectUrl="/" signInForceRedirectUrl="/">
    <Button size="sm">회원가입</Button>
  </SignUpButton>
  ```

- **시공업체**: "시공업체가입" 버튼을 통해 업체 회원으로 가입
  ```tsx
  <SignUpButton mode="modal" forceRedirectUrl="/contractor-register" signInForceRedirectUrl="/contractor-register">
    <Button variant="secondary" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
      <Building className="w-4 h-4 mr-1" />
      시공업체가입
    </Button>
  </SignUpButton>
  ```

### 핵심 차이점
- 일반 회원가입은 가입 후 홈페이지(`/`)로 리디렉션
- 시공업체 가입은 가입 후 업체 정보 등록 페이지(`/contractor-register`)로 리디렉션

## 2. 사용자 타입 구분 방식

### 데이터베이스 구조
- 모든 사용자는 Clerk에서 관리되는 기본 사용자 계정을 가짐
- 시공업체는 추가로 `contractors` 테이블에 정보가 등록됨
  ```tsx
  // DB 스키마에서 contractors 테이블 정의
  export const contractors = pgTable("contractors", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    clerkUserId: varchar({ length: 255 }).notNull().unique(), // Clerk user ID
    businessName: varchar({ length: 255 }).notNull(),
    // 기타 시공업체 관련 필드들...
  });
  ```

### 사용자 타입 확인 로직
1. **API 엔드포인트**: `/api/user/type` 에서 사용자 타입 확인
   ```tsx
   // src/app/api/user/type/route.ts
   export async function GET() {
     try {
       const user = await currentUser()
       if (!user?.id) {
         return NextResponse.json({ isContractor: false }, { status: 200 })
       }
       const { isContractor } = await checkUserType(user.id)
       return NextResponse.json({ isContractor }, { status: 200 })
     } catch (error) {
       console.error('사용자 타입 확인 API 오류:', error)
       return NextResponse.json({ isContractor: false }, { status: 200 })
     }
   }
   ```

2. **타입 체크 함수**: `checkUserType` 함수를 통해 사용자가 시공업체인지 확인
   ```tsx
   // src/lib/user-type.ts
   export async function checkUserType(userId: string) {
     if (!userId) {
       return { isContractor: false, contractor: null }
     }
     try {
       const contractor = await getContractorByUserId(userId)
       return { 
         isContractor: !!contractor, 
         contractor 
       }
     } catch (error) {
       console.error('사용자 타입 확인 실패:', error)
       return { isContractor: false, contractor: null }
     }
   }
   ```

3. **DB 쿼리**: `getContractorByUserId` 함수로 해당 사용자의 시공업체 정보 조회
   ```tsx
   // src/db/queries/contractors.ts
   export async function getContractorByUserId(clerkUserId: string) {
     const result = await db
       .select()
       .from(contractors)
       .where(eq(contractors.clerkUserId, clerkUserId))
       .limit(1)
     return result[0] || null
   }
   ```

## 3. 사용자 인터페이스 분기 처리

### AuthButtons 컴포넌트에서의 분기 처리
1. **사용자 타입 훅**: `useUserType` 훅을 통해 현재 사용자 타입 확인
   ```tsx
   function useUserType(): UserTypeInfo {
     const { user, isLoaded } = useUser();
     const [userType, setUserType] = useState<UserTypeInfo>({
       isContractor: false,
       isLoading: true
     });

     useEffect(() => {
       // 사용자 로그인 상태 확인 후 API 호출
       if (!isLoaded || !user?.id) return;
       
       const checkUserType = async () => {
         try {
           const response = await fetch('/api/user/type');
           if (response.ok) {
             const data = await response.json();
             setUserType({ isContractor: data.isContractor, isLoading: false });
           }
         } catch (error) {
           console.error('사용자 타입 확인 실패:', error);
           setUserType({ isContractor: false, isLoading: false });
         }
       };

       checkUserType();
     }, [user?.id, isLoaded]);

     return userType;
   }
   ```

2. **메뉴 분기 처리**: 사용자 타입에 따라 다른 메뉴 제공
   ```tsx
   <UserButton.MenuItems>
     {isContractor ? (
       <UserButton.Action
         label="업체 프로필 수정"
         labelIcon={<Settings className="w-4 h-4" />}
         onClick={handleContractorProfileEdit}
       />
     ) : (
       <UserButton.Action
         label="견적 요청 목록"
         labelIcon={<List className="w-4 h-4" />}
         onClick={() => window.location.href = '/quote-request/list'}
       />
     )}
   </UserButton.MenuItems>
   ```

## 4. 시공업체 등록 프로세스

1. **회원가입 후 리디렉션**: 시공업체 가입 버튼 클릭 → Clerk 회원가입 → `/contractor-register` 페이지로 리디렉션

2. **업체 정보 등록**: `/contractor-register` 페이지에서 시공업체 정보 입력
   ```tsx
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     // 폼 데이터 처리 및 시공업체 정보 저장
     const result = isEditMode 
       ? await updateContractorAction(formDataForSubmit)
       : await registerContractorAction(formDataForSubmit);
     
     if (result.success) {
       // 성공 시 처리
     }
   };
   ```

3. **DB 저장**: 시공업체 정보를 `contractors` 테이블에 저장
   ```tsx
   // src/db/queries/contractors.ts
   export async function createContractor(data: {
     clerkUserId: string
     businessName: string
     // 기타 필드들...
   }) {
     const [contractor] = await db
       .insert(contractors)
       .values({
         clerkUserId: data.clerkUserId,
         businessName: data.businessName,
         // 기타 필드들...
       })
       .returning()

     return contractor
   }
   ```

## 5. 로그인 후 사용자 타입 구분 프로세스

1. **로그인**: 사용자가 로그인하면 Clerk에서 인증 처리

2. **사용자 타입 확인**: `AuthButtons` 컴포넌트에서 `useUserType` 훅을 통해 사용자 타입 확인
   - 백엔드에서 `contractors` 테이블 조회로 시공업체 여부 판단

3. **UI 분기 처리**: 사용자 타입에 따라 다른 메뉴 제공
   - 시공업체: "업체 프로필 수정" 메뉴 제공
   - 시공의뢰자: "견적 요청 목록" 메뉴 제공

## 6. 페이지 접근 제어

- **시공업체 프로필 페이지**: 시공업체만 접근 가능
  ```tsx
  // src/app/contractor-profile/page.tsx
  useEffect(() => {
    async function loadContractorData() {
      if (!isLoaded) return;
      
      if (!user) {
        router.push('/');
        return;
      }

      try {
        const result = await getCurrentContractorAction();
        if (result.success && result.contractor) {
          setContractorData(result.contractor as ContractorData);
        } else {
          // 등록되지 않은 경우 등록 페이지로 리디렉션
          router.push('/contractor-register');
          return;
        }
      } catch (error) {
        console.error('시공업체 데이터 로드 오류:', error);
      }
    }

    loadContractorData();
  }, [user, isLoaded, router]);
  ```

- **견적 요청 목록 페이지**: 로그인한 사용자만 접근 가능
  ```tsx
  // src/app/quote-request/list/page.tsx
  export default async function QuoteRequestListPage() {
    const user = await currentUser()
    
    if (!user?.id) {
      redirect('/sign-in')
    }

    return (
      // 페이지 컨텐츠
    )
  }
  ```

## 요약

1. **회원가입 단계에서 구분**:
   - 일반 회원가입 버튼 → 시공의뢰자
   - 시공업체가입 버튼 → 시공업체

2. **DB 구조로 구분**:
   - 모든 사용자는 Clerk에 등록
   - 시공업체는 추가로 `contractors` 테이블에 정보 저장

3. **사용자 타입 확인 로직**:
   - `/api/user/type` API를 통해 사용자가 시공업체인지 확인
   - `contractors` 테이블에서 해당 사용자 ID로 조회하여 시공업체 여부 판단

4. **UI 분기 처리**:
   - 시공업체: "업체 프로필 수정" 메뉴 제공
   - 시공의뢰자: "견적 요청 목록" 메뉴 제공

이 시스템을 통해 하나의 인증 시스템(Clerk)으로 두 가지 사용자 타입을 효과적으로 관리하고, 각 사용자 타입에 맞는 UI와 기능을 제공하고 있습니다.
