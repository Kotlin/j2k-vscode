package org.springframework.samples.petclinic.owner;

import java.util.List;
import java.util.Optional;

import jakarta.annotation.Nonnull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
interface OwnerRepository : JpaRepository<Owner, Int> {
    fun findByLastNameStartingWith(lastName: String, pageable: Pageable?): Page<Owner>
}
