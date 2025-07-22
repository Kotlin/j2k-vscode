// 2025-07-22T09:07:14.022Z (logged at)

package org.springframework.samples.petclinic.owner

import java.util.List
import java.util.Optional
import jakarta.annotation.Nonnull
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.samples.petclinic.owner.PetType

interface PetTypeRepository : JpaRepository<PetType, Int> {
    @Query("SELECT ptype FROM PetType ptype ORDER BY ptype.name")
    fun findPetTypes(): List<PetType>
}
